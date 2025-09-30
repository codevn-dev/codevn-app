import {
  articleRepository,
  categoryRepository,
  reactionsRepository,
  commentRepository,
  userRepository,
} from '../database/repository';
import { BaseService } from './base';
import {
  CreateArticleRequest,
  UpdateArticleRequest,
  Article,
  ArticleListResponse,
} from '@/types/shared/article';
import { CommentListResponse, Comment } from '@/types/shared/comment';
import {
  CommentQueryParams as CommentQuery,
  CreateCommentRequest as CreateCommentBody,
} from '@/types/shared/comment';
import { CommonError, RoleLevel } from '@/types/shared';
import { calculateFeaturedArticleScore } from '@/lib/utils/score';
import { getRedis } from '@/lib/server';
import { calculateRelatedArticleScore } from '@/lib/utils/score';
import { categoryRepository as categoryRepoDirect } from '../database/repository/categorys';

export class ArticlesService extends BaseService {
  /**
   * Get pagination parameters from request
   */
  private getPaginationParams(request: any): { page: number; limit: number; offset: number } {
    const query = request.query || {};
    const page = Math.max(1, parseInt(query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '9')));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
  }

  /**
   * Get sort parameters from request
   */
  private getSortParams(
    request: any,
    allowedFields: string[]
  ): { sortBy: string; sortOrder: 'asc' | 'desc' } {
    const query = request.query || {};
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = (query.sortOrder || 'desc') as 'asc' | 'desc';

    if (!allowedFields.includes(sortBy)) {
      throw new Error(CommonError.BAD_REQUEST);
    }

    return { sortBy, sortOrder };
  }

  /**
   * Get search parameter from request
   */
  private getSearchParam(request: any): string {
    const query = request.query || {};
    return query.search || '';
  }

  /**
   * Transform article data to include author information
   */
  private transformArticleData(article: any): any {
    return {
      id: article.id,
      title: article.title,
      content: article.content,
      slug: article.slug,
      thumbnail: article.thumbnail || undefined,
      // categoryId removed from API response (UI uses category.id)
      published: article.published,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt ?? null,
      author: {
        id: article.author?.id || article.authorId,
        name: article.author?.name || 'Unknown',
        avatar: article.author?.avatar || null,
      },
      category: article.category
        ? {
            id: article.categoryId,
            name: article.category?.name || 'Unknown',
            color: article.category?.color || '#000000',
            slug: article.category?.slug || '',
          }
        : undefined,
      _count: {
        comments: article._count?.comments ?? 0,
        likes: article._count?.likes ?? 0,
        unlikes: article._count?.unlikes ?? 0,
      },
      userHasLiked: article.userHasLiked ?? undefined,
      userHasUnliked: article.userHasUnliked ?? undefined,
      views: typeof article.views === 'number' ? article.views : undefined,
    };
  }

  /**
   * Transform article data for list views (omit heavy fields like content)
   */
  private transformArticleSummary(article: any): any {
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      thumbnail: article.thumbnail || undefined,
      // categoryId removed from API response (UI uses category.id)
      published: article.published,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt ?? null,
      author: {
        id: article.author?.id || article.authorId,
        name: article.author?.name || 'Unknown',
        avatar: article.author?.avatar || null,
      },
      category: article.category
        ? {
            id: article.categoryId,
            name: article.category?.name || 'Unknown',
            color: article.category?.color || '#000000',
            slug: article.category?.slug || '',
          }
        : undefined,
      _count: {
        comments: article._count?.comments ?? 0,
        likes: article._count?.likes ?? 0,
        unlikes: article._count?.unlikes ?? 0,
      },
      userHasLiked: article.userHasLiked ?? undefined,
      userHasUnliked: article.userHasUnliked ?? undefined,
      views: typeof article.views === 'number' ? article.views : undefined,
    };
  }

  /**
   * Transform comment data to include author information
   */
  private transformCommentData(comment: any): any {
    return {
      id: comment.id,
      content: comment.content,
      articleId: comment.articleId,
      parentId: comment.parentId ?? null,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt ?? null,
      author: {
        id: comment.author?.id || comment.authorId,
        name: comment.author?.name || 'Unknown',
        avatar: comment.author?.avatar || null,
      },
      replies: Array.isArray(comment.replies)
        ? comment.replies.map((c: any) => this.transformCommentData(c))
        : undefined,
      replyCount: typeof comment.replyCount === 'number' ? comment.replyCount : undefined,
      likeCount: typeof comment.likeCount === 'number' ? comment.likeCount : undefined,
      unlikeCount: typeof comment.unlikeCount === 'number' ? comment.unlikeCount : undefined,
      userHasLiked: comment.userHasLiked ?? undefined,
      userHasUnliked: comment.userHasUnliked ?? undefined,
      parent: comment.parent
        ? {
            id: comment.parent.id,
            content: comment.parent.content,
            author: {
              id: comment.parent.author?.id || comment.parent.authorId,
              name: comment.parent.author?.name || 'Unknown',
            },
          }
        : undefined,
    };
  }

  /**
   * Get articles with filtering and pagination
   */
  async getArticles(request: any, userId?: string): Promise<ArticleListResponse> {
    try {
      const query = request.query || {};
      const { page, limit } = this.getPaginationParams(request);
      const { sortBy, sortOrder } = this.getSortParams(request, [
        'title',
        'createdAt',
        'updatedAt',
      ]);
      const search = this.getSearchParam(request);

      const status = query.status || 'all';
      const categoryIdsParam = query.categoryIds;
      const categoriesParam = query.categories;
      const authorId = query.authorId || '';
      const publishedOnlyParam = query.publishedOnly;

      // Check if user is authenticated
      const user = userId ? await userRepository.findById(userId) : null;
      // Determine if user is admin
      const isAdmin = user?.role === RoleLevel.admin;

      // Respect explicit client intent for publishedOnly even for admin.
      // Default behavior: if not specified, admins see all, others see only published.
      const publishedOnly = publishedOnlyParam === null ? !isAdmin : publishedOnlyParam === 'true';

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
        userId: userId,
      });

      const hasNext = result.pagination.page < result.pagination.totalPages;
      const hasPrev = result.pagination.page > 1;

      return {
        articles: result.articles.map((article: any) => this.transformArticleSummary(article)),
        pagination: {
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
          hasNext,
          hasPrev,
        },
      };
    } catch (error) {
      this.handleError(error, 'Get articles');
    }
  }

  /**
   * Get featured articles in the last `windowHours` hours, ranked by engagement score
   */
  async getFeaturedArticles(request: any): Promise<Article[]> {
    try {
      const { limit, windowDays } = request.query || {};
      const windowHours = windowDays ? parseInt(windowDays) * 24 : 24;
      const limitNum = Math.max(1, Math.min(20, parseInt(limit || '3')));
      const cacheKey = `articles:featured:${limitNum}:${windowHours}`;
      const redis = getRedis();

      // Try cache of IDs → hydrate with counts
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const ids: string[] = JSON.parse(cached);
          if (Array.isArray(ids) && ids.length > 0) {
            const articlesFull = await articleRepository.findManyByIdsWithCounts(ids, undefined, true);
            const list = articlesFull.map((a: any) => this.transformArticleSummary(a));
            if (list.length > 0) return list as Article[];
          }
        }
      } catch {}
      // Fetch most recent published articles (cap to a sane number for scoring)
      const result = await articleRepository.findManyWithPagination({
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        status: 'published',
        publishedOnly: true,
        createdAfter: new Date(Date.now() - windowHours * 60 * 60 * 1000),
      });

      const recent = result.articles || [];

      const withScore = recent.map((a: any) => {
        const likes = a._count?.likes ?? 0;
        const comments = a._count?.comments ?? 0;
        const dislikes = a._count?.unlikes ?? 0;
        const views = typeof a.views === 'number' ? a.views : 0;
        const score = calculateFeaturedArticleScore(
          { likes, dislikes, comments, views, createdAt: new Date(a.createdAt) },
          windowHours
        );
        return { article: a, score };
      });

      withScore.sort((x, y) => y.score - x.score);
      const topArticles = withScore.slice(0, limitNum).map((x) => x.article);

      // Cache IDs for 1 hour
      try {
        const ids = topArticles.map((a: any) => a.id);
        await redis.set(cacheKey, JSON.stringify(ids), 'EX', 3600);
      } catch {}

      return topArticles.map((a: any) => this.transformArticleSummary(a)) as Article[];
    } catch (error) {
      this.handleError(error, 'Get featured articles');
    }
  }

  /**
   * Get article by slug
   */
  async getArticleBySlug(slug: string, userId?: string): Promise<Article> {
    try {
      if (!slug) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      const article = await articleRepository.findBySlug(slug);
      if (!article) {
        throw new Error(CommonError.NOT_FOUND);
      }

      // Check if article is published or if user is the author
      if (!article.published) {
        if (!userId || article.authorId !== userId) {
          throw new Error(CommonError.NOT_FOUND);
        }
      }

      // Get user's reaction if authenticated
      let userReaction = null;
      if (userId) {
        const likeReaction = await reactionsRepository.findByUserAndArticle(
          userId,
          article.id,
          'like'
        );
        const unlikeReaction = await reactionsRepository.findByUserAndArticle(
          userId,
          article.id,
          'unlike'
        );
        userReaction = likeReaction || unlikeReaction;
      }

      // Get article statistics
      const [likeCount, unlikeCount] = await Promise.all([
        reactionsRepository.getReactionsByArticle(article.id, 'like'),
        reactionsRepository.getReactionsByArticle(article.id, 'unlike'),
      ]);

      const views = await articleRepository.getViewCount(article.id);

      const response: Article = {
        id: article.id,
        title: article.title,
        content: article.content,
        slug: article.slug,
        thumbnail: article.thumbnail || undefined,
        // categoryId removed from API response (UI uses category.id)
        published: article.published,
        createdAt: article.createdAt as any,
        updatedAt: article.updatedAt as any,
        views,
        author: {
          id: article.authorId,
          name: article.author?.name || 'Unknown',
          avatar: article.author?.avatar || undefined,
        },
        category: {
          id: article.categoryId,
          name: article.category?.name || 'Unknown',
          color: article.category?.color || '#000000',
          slug: article.category?.slug || '',
        },
        _count: {
          likes: likeCount.length,
          unlikes: unlikeCount.length,
          comments: 0, // Will be populated separately if needed
        },
        userHasLiked: userReaction?.type === 'like',
        userHasUnliked: userReaction?.type === 'unlike',
      };

      return response;
    } catch (error) {
      this.handleError(error, 'Get article by slug');
    }
  }

  /**
   * Get related articles by score (same category/related category/same author + engagement)
   */
  async getRelatedArticles(articleId: string, limit: number = 5): Promise<Article[]> {
    try {
      // Base article
      const base = await articleRepository.findById(articleId);
      if (!base) throw new Error(CommonError.NOT_FOUND);
      const baseCategory = await categoryRepoDirect.findById(base.categoryId);
      const baseParentId = (baseCategory as any)?.parent?.id || null;

      // Cache by base article id and limit
      const redis = getRedis();
      const cacheKey = `articles:related:${articleId}:${limit}`;
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const ids: string[] = JSON.parse(cached);
          if (Array.isArray(ids) && ids.length > 0) {
            const articlesFull = await articleRepository.findManyByIdsWithCounts(ids);
            // Preserve cache order
            const order = new Map(ids.map((id, i) => [id, i] as const));
            articlesFull.sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
            return articlesFull
              .slice(0, limit)
              .map((a: any) => this.transformArticleSummary(a)) as Article[];
          }
        }
      } catch {}

      // Query 1: by category family (same or siblings/children)
      let categoryIds: string[] = [base.categoryId];
      if (baseParentId) {
        const siblings = await categoryRepoDirect.findChildrenIds(baseParentId);
        categoryIds = Array.from(new Set([...categoryIds, ...siblings]));
      } else if ((baseCategory as any)?.id) {
        const children = await categoryRepoDirect.findChildrenIds((baseCategory as any).id);
        categoryIds = Array.from(new Set([...categoryIds, ...children]));
      }

      const byCategory = await articleRepository.findManyWithPagination({
        page: 1,
        limit: 1000,
        status: 'published',
        publishedOnly: true,
        categoryIds,
      });

      // Query 2: by author
      const byAuthor = await articleRepository.findManyWithPagination({
        page: 1,
        limit: 1000,
        status: 'published',
        publishedOnly: true,
        authorId: (base as any).author?.id || (base as any).authorId,
      });

      const candidates = [...(byCategory.articles || []), ...(byAuthor.articles || [])].filter(
        (a: any) => a.id !== base.id
      );

      // Precompute category parents (small N)
      const parentCache = new Map<string, string | null>();
      const getParentId = async (catId: string): Promise<string | null> => {
        if (parentCache.has(catId)) return parentCache.get(catId)!;
        const cat = await categoryRepoDirect.findById(catId);
        const pid = (cat as any)?.parent?.id || null;
        parentCache.set(catId, pid);
        return pid;
      };

      const scored: Array<{ article: any; score: number }> = [];
      for (const a of candidates) {
        if (!a.categoryId) continue;
        const aParentId = await getParentId(a.categoryId as string);
        const sameCategory = a.categoryId === base.categoryId;
        const relatedCategory =
          a.categoryId === baseParentId || // candidate is a child of base's parent
          base.categoryId === aParentId || // base is a child of candidate's parent
          (aParentId && baseParentId && aParentId === baseParentId); // share same parent
        const sameAuthor =
          (a.author?.id || (a as any).authorId) === (base as any).authorId ||
          a.author?.id === (base as any).author?.id;
        const likes = a._count?.likes || 0;
        const dislikes = a._count?.unlikes || 0;
        const comments = a._count?.comments || 0;
        const views = typeof a.views === 'number' ? a.views : 0;
        const score = calculateRelatedArticleScore({
          likes,
          dislikes,
          comments,
          views,
          sameCategory,
          relatedCategory,
          sameAuthor,
        } as any);
        scored.push({ article: a, score });
      }

      scored.sort((x, y) => y.score - x.score);
      const topArticles = scored.slice(0, limit).map((x) => x.article);

      // Cache IDs for 1 hour
      try {
        const ids = topArticles.map((a: any) => a.id);
        await redis.set(cacheKey, JSON.stringify(ids), 'EX', 3600);
      } catch {}

      return topArticles.map((a: any) => this.transformArticleSummary(a)) as Article[];
    } catch (error) {
      this.handleError(error, 'Get related articles');
    }
  }

  // Legacy increment removed; views are now recorded via trackArticleView

  /**
   * Track a validated view with optional session/user uniqueness and metadata
   */
  async trackArticleView(
    articleId: string,
    opts: {
      userId?: string | null;
      sessionId?: string | null;
      countryCode?: string | null;
      device?: string | null;
    }
  ): Promise<boolean> {
    try {
      if (!articleId) throw new Error(CommonError.BAD_REQUEST);

      // Ensure article exists
      const article = await articleRepository.findById(articleId);
      if (!article) throw new Error(CommonError.NOT_FOUND);

      await articleRepository.recordArticleView({ articleId, ...opts });
      return true;
    } catch (error) {
      this.handleError(error, 'Track article view');
    }
  }

  /**
   * Create new article
   */
  async createArticle(body: CreateArticleRequest, userId: string): Promise<Article> {
    try {
      const { title, content, slug, thumbnail, categoryId, published = false } = body;

      this.validateRequiredFields(body, ['title', 'content', 'slug', 'categoryId']);

      // Check if slug already exists
      const existingArticle = await articleRepository.checkSlugExists(slug);
      if (existingArticle) {
        throw new Error(CommonError.CONFLICT);
      }

      // Verify category exists
      const category = await categoryRepository.findById(categoryId);
      if (!category) {
        throw new Error(CommonError.NOT_FOUND);
      }

      // Create article
      const newArticle = await articleRepository.create({
        title,
        content,
        slug,
        thumbnail,
        categoryId,
        authorId: userId,
        published,
      });

      // Fetch the created article with relations
      const createdArticle = await articleRepository.findById(newArticle[0].id);
      if (!createdArticle) {
        throw new Error(CommonError.INTERNAL_ERROR);
      }

      return this.transformArticleData(createdArticle) as Article;
    } catch (error) {
      this.handleError(error, 'Create article');
    }
  }

  /**
   * Update article
   */
  async updateArticle(body: UpdateArticleRequest, userId: string): Promise<Article> {
    try {
      const { id, title, content, slug, thumbnail, categoryId, published } = body;

      if (!id) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      // Check if article exists
      const existingArticle = await articleRepository.findById(id);
      if (!existingArticle) {
        throw new Error(CommonError.NOT_FOUND);
      }

      // Check ownership
      this.validateOwnership({ id: userId, role: 'user' }, existingArticle.authorId);

      // Check if slug already exists (excluding current article)
      if (slug && slug !== existingArticle.slug) {
        const slugExists = await articleRepository.checkSlugExists(slug, id);
        if (slugExists) {
          throw new Error(CommonError.CONFLICT);
        }
      }

      // Verify category exists if provided
      if (categoryId) {
        const category = await categoryRepository.findById(categoryId);
        if (!category) {
          throw new Error(CommonError.NOT_FOUND);
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

      return this.transformArticleData(updatedArticle) as Article;
    } catch (error) {
      this.handleError(error, 'Update article');
    }
  }

  /**
   * Delete article
   */
  async deleteArticle(articleId: string, userId: string): Promise<boolean> {
    try {
      if (!articleId) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      // Check if article exists
      const existingArticle = await articleRepository.findById(articleId);
      if (!existingArticle) {
        throw new Error(CommonError.NOT_FOUND);
      }

      // Check ownership
      this.validateOwnership({ id: userId, role: 'user' }, existingArticle.authorId);

      // Delete article (cascade will handle related comments and likes)
      await articleRepository.delete(articleId);
      return true;
    } catch (error) {
      this.handleError(error, 'Delete article');
    }
  }

  /**
   * Handle article reaction (like/dislike)
   */
  async handleArticleReaction(articleId: string, userId: string, action: string): Promise<any> {
    try {
      if (!action || !['like', 'unlike', 'dislike'].includes(action)) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      // Normalize 'dislike' to 'unlike' for database compatibility
      const normalizedType: 'like' | 'unlike' =
        action === 'dislike' ? 'unlike' : (action as 'like' | 'unlike');

      // Check if article exists
      const article = await articleRepository.findById(articleId);
      if (!article) {
        throw new Error(CommonError.NOT_FOUND);
      }

      // Check if user already reacted to this article with the same type
      const existingReaction = await reactionsRepository.findByUserAndArticle(
        userId,
        articleId,
        normalizedType
      );

      if (existingReaction) {
        // User already has this reaction, remove it
        await reactionsRepository.deleteArticleReaction(userId, articleId, normalizedType);
        return {
          success: true,
          action: 'removed',
          reaction: null,
        };
      } else {
        // Check if user has the opposite reaction
        const oppositeType = normalizedType === 'like' ? 'unlike' : 'like';
        const oppositeReaction = await reactionsRepository.findByUserAndArticle(
          userId,
          articleId,
          oppositeType
        );

        if (oppositeReaction) {
          // User has opposite reaction, remove it and create new one
          await reactionsRepository.deleteArticleReaction(userId, articleId, oppositeType);
        }

        // Create new reaction
        await reactionsRepository.createArticleReaction(userId, articleId, normalizedType);

        return {
          success: true,
          action: 'created',
          reaction: { type: action },
        };
      }
    } catch (error) {
      this.handleError(error, 'Article reaction');
    }
  }

  /**
   * Get user's reaction to article
   */
  async getUserArticleReaction(articleId: string, userId: string): Promise<any> {
    try {
      // Check if article exists
      const article = await articleRepository.findById(articleId);
      if (!article) {
        throw new Error(CommonError.NOT_FOUND);
      }

      // Get user's reaction (check both like and unlike)
      const likeReaction = await reactionsRepository.findByUserAndArticle(
        userId,
        articleId,
        'like'
      );
      const unlikeReaction = await reactionsRepository.findByUserAndArticle(
        userId,
        articleId,
        'unlike'
      );

      const reaction = likeReaction || unlikeReaction;

      return {
        reaction: reaction ? { type: reaction.type } : null,
      };
    } catch (error) {
      this.handleError(error, 'Get article reaction');
    }
  }

  /**
   * Remove user's reaction to article
   */
  async removeUserArticleReaction(articleId: string, userId: string): Promise<any> {
    try {
      // Check if article exists
      const article = await articleRepository.findById(articleId);
      if (!article) {
        throw new Error(CommonError.NOT_FOUND);
      }

      // Check if user has any reaction (like or unlike)
      const likeReaction = await reactionsRepository.findByUserAndArticle(
        userId,
        articleId,
        'like'
      );
      const unlikeReaction = await reactionsRepository.findByUserAndArticle(
        userId,
        articleId,
        'unlike'
      );

      const existingReaction = likeReaction || unlikeReaction;

      if (!existingReaction) {
        throw new Error(CommonError.NOT_FOUND);
      }

      // Remove the reaction
      await reactionsRepository.deleteArticleReaction(userId, articleId, existingReaction.type);

      return {
        success: true,
        action: 'removed',
        reaction: null,
      };
    } catch (error) {
      this.handleError(error, 'Delete article reaction');
    }
  }

  /**
   * Get article comments
   */
  async getArticleComments(
    articleId: string,
    query: CommentQuery,
    userId?: string
  ): Promise<CommentListResponse> {
    try {
      const { sortOrder = 'desc', page = '1', limit = '10', parentId } = query;

      // Check if article exists
      const article = await articleRepository.findById(articleId);
      if (!article) {
        throw new Error(CommonError.NOT_FOUND);
      }

      // Get pagination parameters
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

      // Get comments for this article
      const result = await commentRepository.findByArticle(articleId, {
        sortOrder: sortOrder as 'asc' | 'desc',
        page: pageNum,
        limit: limitNum,
        parentId: parentId || null,
        userId: userId,
      });

      return {
        comments: result.comments.map((comment: any) => this.transformCommentData(comment)),
        pagination: result.pagination as any,
      };
    } catch (error) {
      this.handleError(error, 'Get article comments');
    }
  }

  /**
   * Create comment on article
   */
  async createArticleComment(
    articleId: string,
    body: CreateCommentBody,
    userId: string
  ): Promise<Comment> {
    try {
      const { content, parentId } = body;

      if (!content || content.trim().length === 0) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      if (content.length > 1000) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      // Check if article exists
      const article = await articleRepository.findById(articleId);
      if (!article) {
        throw new Error(CommonError.NOT_FOUND);
      }

      // If parentId is provided, validate it exists
      if (parentId) {
        const parentComment = await commentRepository.findById(parentId);
        if (!parentComment) {
          throw new Error(CommonError.NOT_FOUND);
        }
        if (parentComment.articleId !== articleId) {
          throw new Error(CommonError.BAD_REQUEST);
        }
      }

      // Create comment
      const newComment = await commentRepository.create({
        content: content.trim(),
        articleId: articleId,
        authorId: userId,
        parentId: parentId || null,
      });

      // Fetch the created comment with relations
      const createdComment = await commentRepository.findById(newComment[0].id);
      if (!createdComment) {
        throw new Error(CommonError.INTERNAL_ERROR);
      }

      return this.transformCommentData(createdComment) as Comment;
    } catch (error) {
      this.handleError(error, 'Create comment');
    }
  }
}

// Export singleton instance
export const articlesService = new ArticlesService();
