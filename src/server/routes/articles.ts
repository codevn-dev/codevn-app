import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  articleRepository,
  categoryRepository,
  likeRepository,
  commentRepository,
  userRepository,
} from '@/lib/database/repository';
// import { Errors } from '@/lib/utils/errors';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../middleware';
import { logger } from '@/lib/utils/logger';
import {
  CreateArticleRequest,
  UpdateArticleRequest,
  ReactionRequest,
  Article,
  ArticleListResponse,
} from '@/types/shared/article';
import { CommentListResponse, Comment } from '@/types/shared/comment';
import { SuccessResponse } from '@/types/shared/common';
import {
  CommentQueryParams as CommentQuery,
  CreateCommentRequest as CreateCommentBody,
} from '@/types/shared/comment';

function getPaginationParams(request: FastifyRequest) {
  const query = request.query as any;
  const page = Math.max(1, parseInt(query.page || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '9')));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function getSortParams(request: FastifyRequest, allowedFields: string[]) {
  const query = request.query as any;
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = (query.sortOrder || 'desc') as 'asc' | 'desc';

  if (!allowedFields.includes(sortBy)) {
    throw new Error(`Invalid sort field. Allowed: ${allowedFields.join(', ')}`);
  }

  return { sortBy, sortOrder };
}

function getSearchParam(request: FastifyRequest): string {
  const query = request.query as any;
  return query.search || '';
}

function requireOwnership(user: any, resourceUserId: string): void {
  if (user.id !== resourceUserId && user.role !== 'admin') {
    throw new Error('You can only access your own resources');
  }
}

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
        const query = request.query as any;
        const { page, limit } = getPaginationParams(request);
        const { sortBy, sortOrder } = getSortParams(request, ['title', 'createdAt', 'updatedAt']);
        const search = getSearchParam(request);

        const status = query.status || 'all';
        const categoryIdsParam = (query as any).categoryIds;
        const categoriesParam = (query as any).categories;
        const authorId = query.authorId || '';
        const publishedOnlyParam = query.publishedOnly;

        // Check if user is authenticated
        const user = authRequest.user ? await userRepository.findById(authRequest.user.id) : null;
        // Determine if user is admin
        const isAdmin = user?.role === 'admin';

        // Respect explicit client intent for publishedOnly even for admin.
        // Default behavior: if not specified, admins see all, others see only published.
        const publishedOnly =
          publishedOnlyParam === null ? !isAdmin : publishedOnlyParam === 'true';

        // Normalize categoryIds from either categoryIds (preferred) or legacy categoryId (CSV)
        const normalizedCategoryIds = Array.isArray(categoryIdsParam)
          ? categoryIdsParam
          : typeof categoryIdsParam === 'string'
            ? categoryIdsParam.split(',').filter(Boolean)
            : undefined;

        // Prepare categoryNames (CSV or array). Lowercase for lookup; repository will handle exists subquery
        const categoryNames: string[] | undefined = (() => {
          const partsNew = Array.isArray(categoriesParam)
            ? (categoriesParam as string[])
            : typeof categoriesParam === 'string'
              ? (categoriesParam as string).split(',')
              : undefined;
          const combined = [...(partsNew || [])].map((s) => s.trim().toLowerCase()).filter(Boolean);
          return combined.length > 0 ? combined : undefined;
        })();

        const result = await articleRepository.findManyWithPagination({
          search,
          sortBy,
          sortOrder,
          page,
          limit,
          status: status as 'all' | 'published' | 'draft',
          categoryIds: normalizedCategoryIds,
          categoryNames,
          authorId: authorId || undefined,
          publishedOnly,
          userId: authRequest.user?.id,
        });
        const hasNext = result.pagination.page < result.pagination.totalPages;
        const hasPrev = result.pagination.page > 1;
        const response: ArticleListResponse = {
          articles: result.articles.map((article: any) => {
            const { authorId, authorName, authorAvatar, ...articleWithoutFlatFields } = article;
            return {
              ...articleWithoutFlatFields,
              author: {
                id: article.author?.id || authorId,
                name: article.author?.name || 'Unknown',
                avatar: article.author?.avatar || null,
              },
            };
          }),
          pagination: {
            page: result.pagination.page,
            limit: result.pagination.limit,
            total: result.pagination.total,
            totalPages: result.pagination.totalPages,
            hasNext,
            hasPrev,
          },
        };
        return reply.send(response);
      } catch (error) {
        logger.error('Get articles error', undefined, error as Error);
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
        const { title, content, slug, thumbnail, categoryId, published = false } = body;

        if (!title || !content || !slug || !categoryId) {
          return reply
            .status(400)
            .send({ error: 'Title, content, slug, and categoryId are required' });
        }

        // Check if slug already exists
        const existingArticle = await articleRepository.checkSlugExists(slug);
        if (existingArticle) {
          return reply.status(400).send({ error: 'Article with this slug already exists' });
        }

        // Verify category exists
        const category = await categoryRepository.findById(categoryId);
        if (!category) {
          return reply.status(404).send({ error: 'Category not found' });
        }

        // Create article
        const newArticle = await articleRepository.create({
          title,
          content,
          slug,
          thumbnail,
          categoryId,
          authorId: authRequest.user!.id,
          published,
        });

        // Fetch the created article with relations
        const createdArticle = await articleRepository.findById(newArticle[0].id);
        if (!createdArticle) {
          return reply.status(500).send({ error: 'Failed to retrieve created article' });
        }

        const { authorId, authorName, authorAvatar, ...articleWithoutFlatFields } =
          createdArticle as any;
        const response = {
          ...articleWithoutFlatFields,
          author: {
            id: createdArticle.author?.id || authorId,
            name: createdArticle.author?.name || 'Unknown',
            avatar: createdArticle.author?.avatar || null,
          },
        } as unknown as Article;
        return reply.status(201).send(response);
      } catch (error) {
        logger.error('Create article error', undefined, error as Error);
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
        const { id, title, content, slug, thumbnail, categoryId, published } = body;

        if (!id) {
          return reply.status(400).send({ error: 'Article ID is required' });
        }

        // Check if article exists
        const existingArticle = await articleRepository.findById(id);
        if (!existingArticle) {
          return reply.status(404).send({ error: 'Article not found' });
        }

        // Check ownership
        requireOwnership(authRequest.user!, existingArticle.authorId);

        // Check if slug already exists (excluding current article)
        if (slug && slug !== existingArticle.slug) {
          const slugExists = await articleRepository.checkSlugExists(slug, id);
          if (slugExists) {
            return reply.status(400).send({ error: 'Article with this slug already exists' });
          }
        }

        // Verify category exists if provided
        if (categoryId) {
          const category = await categoryRepository.findById(categoryId);
          if (!category) {
            return reply.status(404).send({ error: 'Category not found' });
          }
        }

        // Update article
        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        if (slug !== undefined) updateData.slug = slug;
        if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
        if (categoryId !== undefined) updateData.categoryId = categoryId;
        if (published !== undefined) updateData.published = published;

        const updatedArticle = await articleRepository.update(id, updateData);

        const { authorId, authorName, authorAvatar, ...articleWithoutFlatFields } =
          updatedArticle as any;
        const response = {
          ...articleWithoutFlatFields,
          author: {
            id: updatedArticle?.author?.id || authorId,
            name: updatedArticle?.author?.name || 'Unknown',
            avatar: updatedArticle?.author?.avatar || null,
          },
        } as unknown as Article;
        return reply.send(response);
      } catch (error) {
        logger.error('Update article error', undefined, error as Error);
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

        if (!id) {
          return reply.status(400).send({ error: 'Article ID is required' });
        }

        // Check if article exists
        const existingArticle = await articleRepository.findById(id);
        if (!existingArticle) {
          return reply.status(404).send({ error: 'Article not found' });
        }

        // Check ownership
        requireOwnership(authRequest.user!, existingArticle.authorId);

        // Delete article (cascade will handle related comments and likes)
        await articleRepository.delete(id);

        const response: SuccessResponse = { success: true };
        return reply.send(response);
      } catch (error) {
        logger.error('Delete article error', undefined, error as Error);
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

        if (!action || !['like', 'unlike', 'dislike'].includes(action)) {
          return reply
            .status(400)
            .send({ error: 'Invalid reaction action. Must be "like", "unlike", or "dislike"' });
        }

        // Normalize 'dislike' to 'unlike' for database compatibility
        const normalizedType = action === 'dislike' ? 'unlike' : action;

        // Check if article exists
        const article = await articleRepository.findById(id);
        if (!article) {
          return reply.status(404).send({ error: 'Article not found' });
        }

        // Check if user already reacted to this article with the same type
        const existingReaction = await likeRepository.findByUserAndArticle(
          authRequest.user!.id,
          id,
          normalizedType
        );

        if (existingReaction) {
          // User already has this reaction, remove it
          await likeRepository.deleteArticleReaction(authRequest.user!.id, id, normalizedType);
          return reply.send({
            success: true,
            action: 'removed',
            reaction: null,
          });
        } else {
          // Check if user has the opposite reaction
          const oppositeType = normalizedType === 'like' ? 'unlike' : 'like';
          const oppositeReaction = await likeRepository.findByUserAndArticle(
            authRequest.user!.id,
            id,
            oppositeType
          );

          if (oppositeReaction) {
            // User has opposite reaction, remove it and create new one
            await likeRepository.deleteArticleReaction(authRequest.user!.id, id, oppositeType);
          }

          // Create new reaction
          await likeRepository.createArticleReaction(authRequest.user!.id, id, normalizedType);

          return reply.send({
            success: true,
            action: 'created',
            reaction: { type: action },
          });
        }
      } catch (error) {
        logger.error('Article reaction error', undefined, error as Error);
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

        // Check if article exists
        const article = await articleRepository.findById(id);
        if (!article) {
          return reply.status(404).send({ error: 'Article not found' });
        }

        // Get user's reaction (check both like and unlike)
        const likeReaction = await likeRepository.findByUserAndArticle(
          authRequest.user!.id,
          id,
          'like'
        );
        const unlikeReaction = await likeRepository.findByUserAndArticle(
          authRequest.user!.id,
          id,
          'unlike'
        );

        const reaction = likeReaction || unlikeReaction;

        return reply.send({
          reaction: reaction ? { type: reaction.type } : null,
        });
      } catch (error) {
        logger.error('Get article reaction error', undefined, error as Error);
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

        // Check if article exists
        const article = await articleRepository.findById(id);
        if (!article) {
          return reply.status(404).send({ error: 'Article not found' });
        }

        // Check if user has any reaction (like or unlike)
        const likeReaction = await likeRepository.findByUserAndArticle(
          authRequest.user!.id,
          id,
          'like'
        );
        const unlikeReaction = await likeRepository.findByUserAndArticle(
          authRequest.user!.id,
          id,
          'unlike'
        );

        const existingReaction = likeReaction || unlikeReaction;

        if (!existingReaction) {
          return reply.status(404).send({ error: 'No reaction found to remove' });
        }

        // Remove the reaction
        await likeRepository.deleteArticleReaction(authRequest.user!.id, id, existingReaction.type);

        return reply.send({
          success: true,
          action: 'removed',
          reaction: null,
        });
      } catch (error) {
        logger.error('Delete article reaction error', undefined, error as Error);
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
        const { sortOrder = 'desc', page = '1', limit = '10', parentId } = query;

        // Check if article exists
        const article = await articleRepository.findById(id);
        if (!article) {
          return reply.status(404).send({ error: 'Article not found' });
        }

        // Get pagination parameters
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const _offset = (pageNum - 1) * limitNum;

        // Get comments for this article
        const result = await commentRepository.findByArticle(id, {
          sortOrder: sortOrder as 'asc' | 'desc',
          page: pageNum,
          limit: limitNum,
          parentId: parentId || null,
          userId: authRequest.user?.id,
        });

        const response: CommentListResponse = {
          comments: result.comments.map((comment: any) => {
            const { authorId, authorName, authorAvatar, ...commentWithoutFlatFields } = comment;
            return {
              ...commentWithoutFlatFields,
              author: {
                id: comment.author?.id || authorId,
                name: comment.author?.name || 'Unknown',
                avatar: comment.author?.avatar || null,
              },
              parent: comment.parent
                ? (() => {
                    const {
                      authorId: parentAuthorId,
                      authorName: parentAuthorName,
                      ...parentWithoutFlatFields
                    } = comment.parent;
                    return {
                      ...parentWithoutFlatFields,
                      author: {
                        id: comment.parent.author?.id || parentAuthorId,
                        name: comment.parent.author?.name || 'Unknown',
                      },
                    };
                  })()
                : undefined,
            };
          }),
          pagination: result.pagination as any,
        };
        return reply.send(response);
      } catch (error) {
        logger.error('Get article comments error', undefined, error as Error);
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
        const { content, parentId } = body;

        if (!content || content.trim().length === 0) {
          return reply.status(400).send({ error: 'Comment content is required' });
        }

        if (content.length > 1000) {
          return reply.status(400).send({ error: 'Comment is too long (max 1000 characters)' });
        }

        // Check if article exists
        const article = await articleRepository.findById(id);
        if (!article) {
          return reply.status(404).send({ error: 'Article not found' });
        }

        // If parentId is provided, validate it exists
        if (parentId) {
          const parentComment = await commentRepository.findById(parentId);
          if (!parentComment) {
            return reply.status(404).send({ error: 'Parent comment not found' });
          }
          if (parentComment.articleId !== id) {
            return reply
              .status(400)
              .send({ error: 'Parent comment does not belong to this article' });
          }
        }

        // Create comment
        const newComment = await commentRepository.create({
          content: content.trim(),
          articleId: id,
          authorId: authRequest.user!.id,
          parentId: parentId || null,
        });

        // Fetch the created comment with relations
        const createdComment = await commentRepository.findById(newComment[0].id);
        if (!createdComment) {
          return reply.status(500).send({ error: 'Failed to retrieve created comment' });
        }

        const { authorId, authorName, authorAvatar, ...commentWithoutFlatFields } =
          createdComment as any;
        const response = {
          ...commentWithoutFlatFields,
          author: {
            id: createdComment.author?.id || authorId,
            name: createdComment.author?.name || 'Unknown',
            avatar: createdComment.author?.avatar || null,
          },
        } as unknown as Comment;
        return reply.status(201).send(response);
      } catch (error) {
        logger.error('Create comment error', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
