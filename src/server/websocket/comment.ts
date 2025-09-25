import { WebSocket } from 'ws';
import { FastifyRequest } from 'fastify';
import { commentRepository } from '../database/repository';
import { logger } from '@/lib/utils/logger';
import { getUserFromToken } from '../middleware/jwt';
import { BaseWebSocketService, BaseConnection } from './base';

interface CommentConnection extends BaseConnection {}

interface CommentMessage {
  type: 'comment' | 'reply' | 'ping' | 'pong' | 'connected' | 'disconnected';
  data?: any;
  articleId?: string;
  fromUserId?: string;
  content?: string;
  parentId?: string | null;
  commentId?: string;
}

class CommentWebSocketService extends BaseWebSocketService<CommentConnection> {
  constructor() {
    super(30000);
    this.setupRedisSubscriptions().catch((error) => {
      logger.error('Error setting up Redis subscriptions for comment', undefined, error as Error);
    });
  }

  protected async setupRedisSubscriptions(): Promise<void> {
    await this.subscriber.subscribe('comment:new_comment');
    await this.subscriber.subscribe('comment:new_reply');

    this.subscriber.on('message', (channel: string, payload: string) => {
      try {
        const message = JSON.parse(payload) as {
          instanceId: string;
          type: string;
          data: any;
        };
        if (message.instanceId === this.instanceId) return;

        switch (channel) {
          case 'comment:new_comment': {
            this.broadcastToAll({ type: 'new_comment', data: message.data });
            break;
          }
          case 'comment:new_reply': {
            this.broadcastToAll({ type: 'new_reply', data: message.data });
            break;
          }
        }
      } catch (error) {
        logger.error('Error handling Redis pubsub message for comment', undefined, error as Error);
      }
    });
  }

  // publish inherited

  // lifecycle inherited

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

  private async handleComment(connectionId: string, message: CommentMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection || !message.content || !message.articleId) return;
    if (!connection.userId) {
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { message: 'Authentication required to comment' },
      });
      return;
    }

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

    // Local broadcast to all connections on the same instance (including sender)
    // This allows the originating client to reconcile optimistic IDs
    this.broadcastToAll({
      type: 'new_comment',
      data: commentData,
    });

    // Publish for cross-instance delivery
    await this.publish('comment:new_comment', commentData);
  }

  private async handleReply(connectionId: string, message: CommentMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection || !message.content || !message.articleId || !message.parentId) return;
    if (!connection.userId) {
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { message: 'Authentication required to reply' },
      });
      return;
    }

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

    // Local broadcast to all connections on the same instance (including sender)
    // This allows the originating client to reconcile optimistic IDs
    this.broadcastToAll({
      type: 'new_reply',
      data: replyData,
    });

    // Publish for cross-instance delivery
    await this.publish('comment:new_reply', replyData);
  }

  // send helpers inherited

  public async addConnection(socket: WebSocket, request: FastifyRequest) {
    try {
      // Try to get token from query parameter, header, or cookies
      const token =
        (request.query as any)?.token ||
        request.headers.authorization?.replace('Bearer ', '') ||
        request.cookies?.['auth-token'];

      let userId: string | null = null;
      if (token) {
        // Verify token if provided. If invalid or throws, proceed as anonymous.
        try {
          const user = await getUserFromToken(token);
          if (user && user.id) {
            userId = user.id;
          } else {
            logger.warn('Comment WebSocket proceeding as anonymous: Invalid token');
          }
        } catch (verifyError) {
          logger.error(
            'Comment WebSocket proceeding as anonymous: Token verification error',
            undefined,
            verifyError as Error
          );
        }
      }

      const connectionId = this.generateConnectionId();
      const connection: CommentConnection = {
        userId,
        socket,
        isAlive: true,
      };

      this.connections.set(connectionId, connection);

      // Add to user connections if authenticated
      if (userId) {
        if (!this.userConnections.has(userId)) {
          this.userConnections.set(userId, new Set());
        }
        this.userConnections.get(userId)!.add(connectionId);
      }

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
        logger.error(
          'WebSocket error',
          { connectionId, userId: userId ?? undefined },
          error as Error
        );
        this.removeConnection(connectionId);
      });

      // Send welcome message
      this.sendToConnection(connectionId, {
        type: 'connected',
        data: { userId, connectionId },
      });
    } catch (error) {
      logger.error('Comment WebSocket connection error', undefined, error as Error);
      socket.close(1011, 'Unexpected error');
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
