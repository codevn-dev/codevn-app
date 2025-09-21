import { WebSocket } from 'ws';
import { FastifyRequest } from 'fastify';
import { commentRepository } from '@/lib/database/repository';
import { logger } from '@/lib/utils/logger';
import { verifyToken } from '../jwt';

interface CommentConnection {
  userId: string;
  socket: WebSocket;
  isAlive: boolean;
}

interface CommentMessage {
  type: 'comment' | 'reply' | 'ping' | 'pong';
  data?: any;
  articleId?: string;
  fromUserId?: string;
  content?: string;
  parentId?: string | null;
  commentId?: string;
}

class CommentWebSocketService {
  private connections: Map<string, CommentConnection> = new Map();
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

  private async handleMessage(connectionId: string, message: CommentMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      switch (message.type) {
        case 'comment':
          await this.handleComment(connectionId, message);
          break;
        case 'reply':
          await this.handleReply(connectionId, message);
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

  private async handleComment(connectionId: string, message: CommentMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection || !message.content || !message.articleId) return;

    // Save comment to database
    const savedComment = await commentRepository.create({
      content: String(message.content).slice(0, 1000),
      articleId: message.articleId,
      authorId: connection.userId,
      parentId: null,
    });

    // Fetch the comment with relations for broadcasting
    const commentWithRelations = await commentRepository.findById(savedComment[0].id);

    if (!commentWithRelations) return;

    // Create comment object for broadcasting
    const commentData = {
      id: commentWithRelations.id,
      content: commentWithRelations.content,
      articleId: commentWithRelations.articleId,
      authorId: commentWithRelations.authorId,
      parentId: commentWithRelations.parentId,
      createdAt: commentWithRelations.createdAt,
      author: commentWithRelations.author,
      replyCount: 0,
      likeCount: 0,
      unlikeCount: 0,
      userHasLiked: false,
      userHasUnliked: false,
    };

    // Send to all connected users except the sender
    this.broadcastToAllExcept(connectionId, {
      type: 'new_comment',
      data: commentData,
    });

    logger.info('Comment sent via WebSocket', {
      fromUserId: connection.userId,
      articleId: message.articleId,
      commentId: savedComment[0].id,
    });
  }

  private async handleReply(connectionId: string, message: CommentMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection || !message.content || !message.articleId || !message.parentId) return;

    // Save reply to database
    const savedReply = await commentRepository.create({
      content: String(message.content).slice(0, 1000),
      articleId: message.articleId,
      authorId: connection.userId,
      parentId: message.parentId,
    });

    // Fetch the reply with relations for broadcasting
    const replyWithRelations = await commentRepository.findById(savedReply[0].id);

    if (!replyWithRelations) return;

    // Create reply object for broadcasting
    const replyData = {
      id: replyWithRelations.id,
      content: replyWithRelations.content,
      articleId: replyWithRelations.articleId,
      authorId: replyWithRelations.authorId,
      parentId: replyWithRelations.parentId,
      createdAt: replyWithRelations.createdAt,
      author: replyWithRelations.author,
      replyCount: 0,
      likeCount: 0,
      unlikeCount: 0,
      userHasLiked: false,
      userHasUnliked: false,
    };

    // Send to all connected users except the sender
    this.broadcastToAllExcept(connectionId, {
      type: 'new_reply',
      data: replyData,
    });

    logger.info('Reply sent via WebSocket', {
      fromUserId: connection.userId,
      articleId: message.articleId,
      parentId: message.parentId,
      replyId: savedReply[0].id,
    });
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

  private broadcastToAll(message: any) {
    this.connections.forEach((_, connectionId) => {
      this.sendToConnection(connectionId, message);
    });
  }

  private broadcastToAllExcept(excludeConnectionId: string, message: any) {
    this.connections.forEach((_, connectionId) => {
      if (connectionId !== excludeConnectionId) {
        this.sendToConnection(connectionId, message);
      }
    });
  }

  public async addConnection(socket: WebSocket, request: FastifyRequest) {
    try {
      // Try to get token from query parameter, header, or cookies
      const token =
        (request.query as any)?.token ||
        request.headers.authorization?.replace('Bearer ', '') ||
        request.cookies?.['auth-token'];

      logger.info('Comment WebSocket connection attempt', {
        hasToken: !!token,
        tokenLength: token?.length,
        query: request.query,
        cookies: request.cookies,
        headers: Object.keys(request.headers),
      });

      if (!token) {
        logger.warn('Comment WebSocket connection rejected: No token');
        socket.close(1008, 'Token required');
        return;
      }

      // Verify token
      const payload = await verifyToken(token);
      if (!payload) {
        logger.warn('Comment WebSocket connection rejected: Invalid token');
        socket.close(1008, 'Invalid token');
        return;
      }

      const userId = payload.id;
      logger.info('Comment WebSocket token verified', { userId });

      const connectionId = this.generateConnectionId();
      const connection: CommentConnection = {
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
          const message: CommentMessage = JSON.parse(data.toString());
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

      logger.info('Comment WebSocket connection added', { connectionId, userId });
    } catch (error) {
      logger.error('Comment WebSocket auth error', undefined, error as Error);
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

export const commentWebSocketService = new CommentWebSocketService();
