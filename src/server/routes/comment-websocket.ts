import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { commentWebSocketService } from '../websocket/comment-websocket';
import { logger } from '@/lib/utils/logger';

export async function commentWebSocketRoutes(fastify: FastifyInstance) {
  // WebSocket endpoint for real-time comments
  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true } as any, (connection: any, request: any) => {
      logger.info('Comment WebSocket connection received', {
        url: request.url,
        headers: request.headers,
        query: request.query,
        connectionKeys: Object.keys(connection),
      });

      // In @fastify/websocket, the connection object IS the WebSocket
      // Pass the connection directly instead of connection.socket
      commentWebSocketService.addConnection(connection, request);
    });
  });

  // GET /api/comments/online-users - Get online users
  fastify.get('/online-users', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const onlineUsers = commentWebSocketService.getOnlineUsers();
      return reply.send({ onlineUsers });
    } catch (error) {
      logger.error('Error in comment online-users GET', undefined, error as Error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
