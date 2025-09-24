import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../middleware';
import { articlesService } from '../services';
import {
  CreateArticleRequest,
  UpdateArticleRequest,
  ReactionRequest,
} from '@/types/shared/article';
import {
  CommentQueryParams as CommentQuery,
  CreateCommentRequest as CreateCommentBody,
} from '@/types/shared/comment';

export async function articleRoutes(fastify: FastifyInstance) {
  // GET /api/articles - Get articles with filtering and pagination
  fastify.get(
    '/',
    {
      preHandler: optionalAuthMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const response = await articlesService.getArticles(request, authRequest.user?.id);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // POST /api/articles - Create new article
  fastify.post<{ Body: CreateArticleRequest }>(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Body: CreateArticleRequest }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const body = request.body as CreateArticleRequest;
        const response = await articlesService.createArticle(body, authRequest.user!.id);
        return reply.status(201).send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // PUT /api/articles - Update article
  fastify.put<{ Body: UpdateArticleRequest }>(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Body: UpdateArticleRequest }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const body = request.body as UpdateArticleRequest;
        const response = await articlesService.updateArticle(body, authRequest.user!.id);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // DELETE /api/articles - Delete article
  fastify.delete(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const query = request.query as any;
        const id = query.id;
        const response = await articlesService.deleteArticle(id, authRequest.user!.id);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // POST /api/articles/:id/reaction - Like/dislike article
  fastify.post<{
    Params: { id: string };
    Body: ReactionRequest;
  }>(
    '/:id/reaction',
    {
      preHandler: authMiddleware,
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: ReactionRequest;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { id } = request.params;
        const body = request.body as ReactionRequest;
        const { action } = body;
        const response = await articlesService.handleArticleReaction(
          id,
          authRequest.user!.id,
          action
        );
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // GET /api/articles/:id/reaction - Get user's reaction to article
  fastify.get<{ Params: { id: string } }>(
    '/:id/reaction',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { id } = request.params;
        const response = await articlesService.getUserArticleReaction(id, authRequest.user!.id);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // DELETE /api/articles/:id/reaction - Remove user's reaction to article
  fastify.delete<{ Params: { id: string } }>(
    '/:id/reaction',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { id } = request.params;
        const response = await articlesService.removeUserArticleReaction(id, authRequest.user!.id);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // GET /api/articles/:id/comments - Get article comments
  fastify.get<{
    Params: { id: string };
    Querystring: CommentQuery;
  }>(
    '/:id/comments',
    {
      preHandler: optionalAuthMiddleware,
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: CommentQuery;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { id } = request.params;
        const query = request.query as CommentQuery;
        const response = await articlesService.getArticleComments(id, query, authRequest.user?.id);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // POST /api/articles/:id/comments - Create comment on article
  fastify.post<{
    Params: { id: string };
    Body: CreateCommentBody;
  }>(
    '/:id/comments',
    {
      preHandler: authMiddleware,
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: CreateCommentBody;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { id } = request.params;
        const body = request.body as CreateCommentBody;
        const response = await articlesService.createArticleComment(id, body, authRequest.user!.id);
        return reply.status(201).send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
