import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, AuthenticatedRequest, optionalAuthMiddleware } from '../middleware';
import { articlesService } from '../services';
import { CommonError } from '@/types/shared';
import { ok, fail } from '../utils/response';
import { CreateArticleRequest, UpdateArticleRequest } from '@/types/shared/article';
import { ReactionRequest } from '@/types/shared/reaction';
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
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
      }
    }
  );

  // GET /api/articles/:id/related - Get related articles
  fastify.get<{ Params: { id: string } }>(
    '/:id/related',
    {
      preHandler: optionalAuthMiddleware,
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const list = await articlesService.getRelatedArticles(id, 5);
        return reply.send(ok({ articles: list }));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
      }
    }
  );

  // GET /api/articles/featured - Get featured articles
  fastify.get(
    '/featured',
    {},
    async (
      request: FastifyRequest<{ Querystring: { limit?: string; windowDays?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const items = await articlesService.getFeaturedArticles(request);
        return reply.send(ok({ articles: items }));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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
        return reply.status(201).send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
      }
    }
  );

  // GET /api/articles/slug/:slug - Get article by slug
  fastify.get<{ Params: { slug: string }; Querystring: { preview?: string } }>(
    '/slug/:slug',
    {
      preHandler: optionalAuthMiddleware,
    },
    async (
      request: FastifyRequest<{ Params: { slug: string }; Querystring: { preview?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { slug } = request.params;
        const { preview } = request.query;

        // If preview=true, use the authenticated user's ID
        const userId = preview === 'true' ? authRequest.user?.id : undefined;

        const response = await articlesService.getArticleBySlug(slug, userId);
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
      }
    }
  );

  // Legacy /:id/views removed; use /:id/track-view

  // POST /api/articles/:id/track-view - Track a validated unique view with metadata
  fastify.post<{ Params: { id: string } }>(
    '/:id/track-view',
    {
      preHandler: optionalAuthMiddleware,
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { id } = request.params;
        const ua = (request.headers['user-agent'] as string) || '';
        const isBot = /bot|crawler|spider|crawling|preview|pingdom|ahrefs|semrush/i.test(ua);

        // Skip tracking for bots
        if (isBot) {
          return reply.send(ok(true));
        }

        // Get country code from Cloudflare header
        const countryCode = (request.headers['cf-ipcountry'] as string) || null;

        // Detect device type from user agent
        const detectDevice = (userAgent: string): string => {
          if (/tablet|ipad/i.test(userAgent)) return 'tablet';
          if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(userAgent))
            return 'mobile';
          return 'desktop';
        };
        const device = detectDevice(ua);

        // Accept optional metadata from client
        const body = (request as any).body || {};
        const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined;

        await articlesService.trackArticleView(id, {
          userId: authRequest.user?.id || null,
          sessionId: sessionId || null,
          countryCode,
          device,
        });
        return reply.send(ok(true));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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
        return reply.status(201).send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
      }
    }
  );
}
