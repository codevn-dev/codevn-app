import { WebSocket } from 'ws';
import { FastifyRequest } from 'fastify';
import { messageRepository } from '@/lib/database/repository';
import { logger } from '@/lib/utils/logger';
import { verifyToken } from '../jwt';

interface ChatConnection {
  userId: string;
  socket: WebSocket;
  isAlive: boolean;
}

interface ChatMessage {
  type: 'message' | 'typing' | 'seen' | 'ping' | 'pong';
  data?: any;
  chatId?: string;
  fromUserId?: string;
  toUserId?: string;
  text?: string;
  messageId?: string;
}

class ChatWebSocketService {
  private connections: Map<string, ChatConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> Set of connectionIds

  constructor() {
    // Set up ping/pong mechanism to keep connections alive
    setInterval(() => {
      this.pingConnections();
    }, 30000); // Ping every 30 seconds
  }

  private generateConnectionId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  private getChatId(userA: string, userB: string): string {
    return [userA, userB].sort().join('|');
  }

  private pingConnections() {
    this.connections.forEach((connection, connectionId) => {
      if (!connection.isAlive) {
        this.removeConnection(connectionId);
        return;
      }

      connection.isAlive = false;
      try {
        connection.socket.ping();
      } catch (error) {
        logger.error('Error pinging connection', { connectionId }, error as Error);
        this.removeConnection(connectionId);
      }
    });
  }

  private removeConnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    this.connections.delete(connectionId);

    // Remove from user connections
    const userConnections = this.userConnections.get(connection.userId);
    if (userConnections) {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        this.userConnections.delete(connection.userId);
      }
    }

    logger.info('WebSocket connection removed', { connectionId, userId: connection.userId });
  }

  private async handleMessage(connectionId: string, message: ChatMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      switch (message.type) {
        case 'message':
          await this.handleChatMessage(connectionId, message);
          break;
        case 'typing':
          await this.handleTyping(connectionId, message);
          break;
        case 'seen':
          await this.handleSeen(connectionId, message);
          break;
        case 'pong':
          connection.isAlive = true;
          break;
        default:
          logger.warn('Unknown message type', { type: message.type, connectionId });
      }
    } catch (error) {
      logger.error(
        'Error handling WebSocket message',
        { connectionId, messageType: message.type },
        error as Error
      );
    }
  }

  private async handleChatMessage(connectionId: string, message: ChatMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection || !message.text || !message.toUserId) return;

    const chatId = this.getChatId(connection.userId, message.toUserId);

    // Save message to database
    const savedMessage = await messageRepository.create({
      chatId,
      fromUserId: connection.userId,
      toUserId: message.toUserId,
      text: String(message.text).slice(0, 4000),
      type: 'message',
    });

    // Create message object for broadcasting
    const messageData = {
      id: savedMessage.id,
      type: savedMessage.type,
      chat: { id: savedMessage.chatId },
      fromUser: { id: savedMessage.fromUserId },
      toUser: { id: savedMessage.toUserId },
      text: savedMessage.text,
      seen: savedMessage.seen,
      seenAt: savedMessage.seenAt,
      timestamp: savedMessage.createdAt.getTime(),
      createdAt: savedMessage.createdAt,
    };

    // Send to sender (confirmation)
    this.sendToConnection(connectionId, {
      type: 'message_sent',
      data: messageData,
    });

    // Send to recipient if online
    this.sendToUser(message.toUserId, {
      type: 'new_message',
      data: messageData,
    });

    logger.info('Chat message sent via WebSocket', {
      fromUserId: connection.userId,
      toUserId: message.toUserId,
      messageId: savedMessage.id,
    });
  }

  private async handleTyping(connectionId: string, message: ChatMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection || !message.toUserId) return;

    // Send typing indicator to recipient
    this.sendToUser(message.toUserId, {
      type: 'typing',
      data: {
        fromUserId: connection.userId,
        isTyping: message.data?.isTyping || false,
      },
    });
  }

  private async handleSeen(connectionId: string, message: ChatMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection || !message.chatId) return;

    // Mark messages as seen in database
    await messageRepository.markAsSeen(message.chatId, connection.userId);

    // Notify sender that messages were seen
    const chatParticipants = message.chatId.split('|');
    const otherUserId = chatParticipants.find((id) => id !== connection.userId);

    if (otherUserId) {
      this.sendToUser(otherUserId, {
        type: 'messages_seen',
        data: {
          chatId: message.chatId,
          seenBy: connection.userId,
        },
      });
    }
  }

  private sendToConnection(connectionId: string, message: any) {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) return;

    try {
      connection.socket.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Error sending message to connection', { connectionId }, error as Error);
      this.removeConnection(connectionId);
    }
  }

  private sendToUser(userId: string, message: any) {
    const userConnections = this.userConnections.get(userId);
    if (!userConnections) return;

    userConnections.forEach((connectionId) => {
      this.sendToConnection(connectionId, message);
    });
  }

  public async addConnection(socket: WebSocket, request: FastifyRequest) {
    try {
      // Try to get token from query parameter, header, or cookies
      const token =
        (request.query as any)?.token ||
        request.headers.authorization?.replace('Bearer ', '') ||
        request.cookies?.['auth-token'];

      logger.info('WebSocket connection attempt', {
        hasToken: !!token,
        tokenLength: token?.length,
        query: request.query,
        cookies: request.cookies,
        headers: Object.keys(request.headers),
      });

      if (!token) {
        logger.warn('WebSocket connection rejected: No token');
        socket.close(1008, 'Token required');
        return;
      }

      // Verify token
      const payload = await verifyToken(token);
      if (!payload) {
        logger.warn('WebSocket connection rejected: Invalid token');
        socket.close(1008, 'Invalid token');
        return;
      }

      const userId = payload.id;
      logger.info('WebSocket token verified', { userId });

      const connectionId = this.generateConnectionId();
      const connection: ChatConnection = {
        userId,
        socket,
        isAlive: true,
      };

      this.connections.set(connectionId, connection);

      // Add to user connections
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(connectionId);

      // Set up event handlers
      socket.on('message', (data) => {
        try {
          const message: ChatMessage = JSON.parse(data.toString());
          this.handleMessage(connectionId, message);
        } catch (error) {
          logger.error('Error parsing WebSocket message', { connectionId }, error as Error);
        }
      });

      socket.on('pong', () => {
        connection.isAlive = true;
      });

      socket.on('close', () => {
        this.removeConnection(connectionId);
      });

      socket.on('error', (error) => {
        logger.error('WebSocket error', { connectionId, userId }, error as Error);
        this.removeConnection(connectionId);
      });

      // Send welcome message
      this.sendToConnection(connectionId, {
        type: 'connected',
        data: { userId, connectionId },
      });

      logger.info('WebSocket connection added', { connectionId, userId });
    } catch (error) {
      logger.error('WebSocket auth error', undefined, error as Error);
      socket.close(1008, 'Authentication failed');
    }
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.userConnections.keys());
  }

  public isUserOnline(userId: string): boolean {
    return this.userConnections.has(userId);
  }
}

export const chatWebSocketService = new ChatWebSocketService();
