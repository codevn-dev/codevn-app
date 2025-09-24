import { WebSocket } from 'ws';
import { FastifyRequest } from 'fastify';
import { messageRepository } from '@/lib/database/repository';
import { logger } from '@/lib/utils/logger';
import { verifyToken } from '../jwt';
import { BaseWebSocketService, BaseConnection } from './base-websocket';

interface ChatConnection extends BaseConnection {
  userId: string;
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

class ChatWebSocketService extends BaseWebSocketService<ChatConnection> {
  constructor() {
    super(30000);
    this.setupRedisSubscriptions().catch((error) => {
      logger.error('Error setting up Redis subscriptions for chat', undefined, error as Error);
    });
  }

  private getChatId(userA: string, userB: string): string {
    return [userA, userB].sort().join('|');
  }

  protected async setupRedisSubscriptions(): Promise<void> {
    await this.subscriber.subscribe('chat:new_message');
    await this.subscriber.subscribe('chat:typing');
    await this.subscriber.subscribe('chat:messages_seen');
    await this.subscriber.subscribe('presence:user_online');
    await this.subscriber.subscribe('presence:user_offline');

    this.subscriber.on('message', (channel: string, payload: string) => {
      try {
        const message = JSON.parse(payload) as {
          instanceId: string;
          type: string;
          data: any;
        };
        if (message.instanceId === this.instanceId) return;

        switch (channel) {
          case 'chat:new_message': {
            const data = message.data;
            // Deliver to recipient
            this.sendToUser(data.toUser.id, { type: 'new_message', data });
            break;
          }
          case 'chat:typing': {
            const data = message.data;
            this.sendToUser(data.toUserId, { type: 'typing', data });
            break;
          }
          case 'chat:messages_seen': {
            const data = message.data;
            this.sendToUser(data.otherUserId, {
              type: 'messages_seen',
              data: { chatId: data.chatId, seenBy: data.seenBy },
            });
            break;
          }
          case 'presence:user_online': {
            const data = message.data;
            this.broadcastToAll({ type: 'user_online', data: { userId: data.userId } });
            break;
          }
          case 'presence:user_offline': {
            const data = message.data;
            this.broadcastToAll({ type: 'user_offline', data: { userId: data.userId } });
            break;
          }
        }
      } catch (error) {
        logger.error('Error handling Redis pubsub message for chat', undefined, error as Error);
      }
    });
  }

  // publish and lifecycle inherited

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
          break;
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

    // Send to recipient if online (local instance)
    this.sendToUser(message.toUserId, {
      type: 'new_message',
      data: messageData,
    });

    // Publish for cross-instance delivery
    await this.publish('chat:new_message', messageData);
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

    // Publish typing to other instances
    await this.publish('chat:typing', {
      toUserId: message.toUserId,
      fromUserId: connection.userId,
      isTyping: message.data?.isTyping || false,
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

      // Publish seen update to other instances
      await this.publish('chat:messages_seen', {
        chatId: message.chatId,
        seenBy: connection.userId,
        otherUserId,
      });
    }
  }

  // send helpers inherited

  public async addConnection(socket: WebSocket, request: FastifyRequest) {
    try {
      // Try to get token from query parameter, header, or cookies
      const token =
        (request.query as any)?.token ||
        request.headers.authorization?.replace('Bearer ', '') ||
        request.cookies?.['auth-token'];

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

      const connectionId = this.generateConnectionId();
      const connection: ChatConnection = { userId, socket, isAlive: true };

      this.connections.set(connectionId, connection);

      // Add to user connections
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(connectionId);

      // If this is the first connection for the user, announce online
      if (this.userConnections.get(userId)!.size === 1) {
        this.onUserOnline(userId);
      }

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
        data: { userId, connectionId, onlineUsers: this.getOnlineUsers() },
      });
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

  protected onUserOnline(userId: string): void {
    // Notify all local connections and publish to other instances
    this.broadcastToAll({ type: 'user_online', data: { userId } });
    void this.publish('presence:user_online', { userId });
  }

  protected onUserOffline(userId: string): void {
    // Notify all local connections and publish to other instances
    this.broadcastToAll({ type: 'user_offline', data: { userId } });
    void this.publish('presence:user_offline', { userId });
  }
}

export const chatWebSocketService = new ChatWebSocketService();
