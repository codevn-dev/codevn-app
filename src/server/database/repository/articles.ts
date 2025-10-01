import { getDb } from '..';
import { articles, comments, reactions, categories, users, articleViews, articleCategories } from '../schema';
import { and, eq, or, ilike, isNull, sql, count, inArray, exists, gte } from 'drizzle-orm';
import { Article as SharedArticle } from '@/types/shared/article';
import { ArticleFilters, PaginatedArticles, ArticleInsertReturning } from '@/types/shared/article';

export class ArticleRepository {
  async findById(id: string) {
    return await getDb().query.articles.findFirst({
      where: and(eq(articles.id, id), isNull(articles.deletedAt)),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        articleCategories: {
          with: {
            category: {
              columns: {
                id: true,
                name: true,
                color: true,
                slug: true,
              },
            },
          },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return await getDb().query.articles.findFirst({
      where: and(eq(articles.slug, slug), isNull(articles.deletedAt)),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        articleCategories: {
          with: {
            category: {
              columns: {
                id: true,
                name: true,
                color: true,
                slug: true,
              },
            },
          },
        },
      },
    });
  }

  // Removed direct counter increment; views are derived from articleViews table

  async recordArticleView(params: {
    articleId: string;
    userId?: string | null;
    sessionId?: string | null;
    countryCode?: string | null;
    device?: string | null;
  }) {
    const {
      articleId,
      userId = null,
      sessionId = null,
      countryCode = null,
      device = null,
    } = params;

    // Always record the view - no restrictions on duplicates
    const db = getDb();
    await db.insert(articleViews).values({
      articleId,
      userId: userId || null,
      sessionId: sessionId || null,
      countryCode: countryCode || null,
      device: device || null,
    });
    return { created: true } as const;
  }

  async getViewCount(articleId: string) {
    const res = await getDb()
      .select({ count: count() })
      .from(articleViews)
      .where(eq(articleViews.articleId, articleId));
    return res[0]?.count || 0;
  }

  async findManyWithPagination(filters: ArticleFilters): Promise<PaginatedArticles> {
    const { userId } = filters;
    const {
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
      status = 'all',
      authorId = '',
      publishedOnly = true,
    } = filters;

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];

    // Always filter out deleted articles
    whereConditions.push(isNull(articles.deletedAt));

    if (search) {
      const searchTerm = `%${search}%`;
      whereConditions.push(
        or(
          ilike(articles.title, searchTerm),
          ilike(articles.content, searchTerm),
          exists(
            getDb()
              .select()
              .from(users)
              .where(
                and(
                  eq(users.id, articles.authorId),
                  or(ilike(users.name, searchTerm), ilike(users.email, searchTerm))
                )
              )
          )
        )
      );
    }

    if (status !== 'all') {
      whereConditions.push(eq(articles.published, status === 'published'));
    }

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      whereConditions.push(
        exists(
          getDb()
            .select()
            .from(articleCategories)
            .where(
              and(
                eq(articleCategories.articleId, articles.id),
                inArray(articleCategories.categoryId, filters.categoryIds)
              )
            )
        )
      );
    }

    if (filters.categoryNames && filters.categoryNames.length > 0) {
      const namesLower = filters.categoryNames.map((n) => n.toLowerCase());
      whereConditions.push(
        exists(
          getDb()
            .select()
            .from(articleCategories)
            .innerJoin(categories, eq(categories.id, articleCategories.categoryId))
            .where(
              and(
                eq(articleCategories.articleId, articles.id),
                sql`lower(${categories.name}) in (${sql.join(
                  namesLower.map((name) => sql`${name}`),
                  sql`, `
                )})`
              )
            )
        )
      );
    }

    if (authorId) {
      whereConditions.push(eq(articles.authorId, authorId));
    }

    if (filters.createdAfter) {
      whereConditions.push(gte(articles.createdAt, filters.createdAfter as Date));
    }

    // If publishedOnly is true and no authorId specified, only show published articles
    if (publishedOnly && !authorId) {
      whereConditions.push(eq(articles.published, true));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count
    const totalCountResult = await getDb()
      .select({ count: count() })
      .from(articles)
      .where(whereClause);

    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Get articles with related data
    const articlesData = await getDb().query.articles.findMany({
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        articleCategories: {
          with: {
            category: {
              columns: {
                id: true,
                name: true,
                color: true,
                slug: true,
              },
            },
          },
        },
      },
      where: whereClause,
      orderBy: (articles, { desc, asc }) => [
        sortOrder === 'desc'
          ? desc(articles[sortBy as keyof typeof articles])
          : asc(articles[sortBy as keyof typeof articles]),
      ],
      limit,
      offset,
    });

    // Batch counts and user reactions to avoid N queries
    const articleIds = articlesData.map((a) => a.id);

    const [
      commentCountsRows,
      likeCountsRows,
      unlikeCountsRows,
      viewCountsRows,
      userLikesRows,
      userUnlikesRows,
    ] = await Promise.all([
      getDb()
        .select({ articleId: comments.articleId, count: count() })
        .from(comments)
        .where(inArray(comments.articleId, articleIds))
        .groupBy(comments.articleId),
      getDb()
        .select({ articleId: reactions.articleId, count: count() })
        .from(reactions)
        .where(and(inArray(reactions.articleId, articleIds), eq(reactions.type, 'like')))
        .groupBy(reactions.articleId),
      getDb()
        .select({ articleId: reactions.articleId, count: count() })
        .from(reactions)
        .where(and(inArray(reactions.articleId, articleIds), eq(reactions.type, 'unlike')))
        .groupBy(reactions.articleId),
      getDb()
        .select({ articleId: articleViews.articleId, count: count() })
        .from(articleViews)
        .where(inArray(articleViews.articleId, articleIds))
        .groupBy(articleViews.articleId),
      userId
        ? getDb()
            .select({ articleId: reactions.articleId })
            .from(reactions)
            .where(
              and(
                inArray(reactions.articleId, articleIds),
                eq(reactions.userId, userId),
                eq(reactions.type, 'like')
              )
            )
        : Promise.resolve([]),
      userId
        ? getDb()
            .select({ articleId: reactions.articleId })
            .from(reactions)
            .where(
              and(
                inArray(reactions.articleId, articleIds),
                eq(reactions.userId, userId),
                eq(reactions.type, 'unlike')
              )
            )
        : Promise.resolve([]),
    ]);

    const toMap = (rows: { articleId: string; count: number }[]) => {
      const map = new Map<string, number>();
      for (const r of rows) map.set(r.articleId, Number(r.count) || 0);
      return map;
    };
    const commentsMap = toMap(commentCountsRows as any);
    const likesMap = toMap(likeCountsRows as any);
    const unlikesMap = toMap(unlikeCountsRows as any);
    const viewsMap = toMap(viewCountsRows as any);
    const userLikesSet = new Set((userLikesRows as any[]).map((r) => r.articleId));
    const userUnlikesSet = new Set((userUnlikesRows as any[]).map((r) => r.articleId));

    const articlesWithCounts: SharedArticle[] = articlesData.map(
      (article) => {
        const { articleCategories, ...articleData } = article as any;
        return {
          ...articleData,
          categories: articleCategories?.map((ac: any) => ac.category) || [],
          views: viewsMap.get(article.id) || 0,
          _count: {
            comments: commentsMap.get(article.id) || 0,
            likes: likesMap.get(article.id) || 0,
            unlikes: unlikesMap.get(article.id) || 0,
          },
          userHasLiked: userId ? userLikesSet.has(article.id) : false,
          userHasUnliked: userId ? userUnlikesSet.has(article.id) : false,
        } as unknown as SharedArticle;
      }
    );

    return {
      articles: articlesWithCounts,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    };
  }

  async create(articleData: {
    title: string;
    content: string;
    slug: string;
    thumbnail?: string;
    categoryIds: string[];
    authorId: string;
    published?: boolean;
  }): Promise<ArticleInsertReturning[]> {
    const db = getDb();
    
    // Create article first
    const createdArticles = await db
      .insert(articles)
      .values({
        title: articleData.title,
        content: articleData.content,
        slug: articleData.slug,
        thumbnail: articleData.thumbnail,
        authorId: articleData.authorId,
        published: articleData.published || false,
      })
      .returning({
        id: articles.id,
        title: articles.title,
        content: articles.content,
        slug: articles.slug,
        thumbnail: articles.thumbnail,
        authorId: articles.authorId,
        published: articles.published,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
      });

    // Create article-category relationships
    if (articleData.categoryIds.length > 0 && createdArticles[0]) {
      const articleCategoryValues = articleData.categoryIds.map(categoryId => ({
        articleId: createdArticles[0].id,
        categoryId: categoryId,
      }));
      
      await db.insert(articleCategories).values(articleCategoryValues);
    }

    return createdArticles;
  }

  async update(
    id: string,
    updateData: {
      title?: string;
      content?: string;
      slug?: string;
      thumbnail?: string;
      categoryIds?: string[];
      published?: boolean;
    }
  ): Promise<Awaited<ReturnType<ArticleRepository['findById']>>> {
    const db = getDb();
    const { categoryIds, ...articleData } = updateData;
    
    // Update article data if provided
    if (Object.keys(articleData).length > 0) {
      const dataToUpdate = { ...articleData, updatedAt: new Date() };
      await db.update(articles).set(dataToUpdate).where(eq(articles.id, id));
    }

    // Update categories if provided
    if (categoryIds !== undefined) {
      // Remove existing category relationships
      await db.delete(articleCategories).where(eq(articleCategories.articleId, id));
      
      // Add new category relationships
      if (categoryIds.length > 0) {
        const articleCategoryValues = categoryIds.map(categoryId => ({
          articleId: id,
          categoryId: categoryId,
        }));
        
        await db.insert(articleCategories).values(articleCategoryValues);
      }
    }

    // Return updated article with relations
    return await this.findById(id);
  }

  async delete(id: string) {
    // Soft delete: set deleted_at timestamp instead of actually deleting
    return await getDb()
      .update(articles)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id));
  }

  async checkSlugExists(slug: string, excludeId?: string) {
    const whereCondition = excludeId
      ? and(
          eq(articles.slug, slug),
          sql`${articles.id} != ${excludeId}`,
          isNull(articles.deletedAt)
        )
      : and(eq(articles.slug, slug), isNull(articles.deletedAt));

    return await getDb().query.articles.findFirst({
      where: whereCondition,
    });
  }

  async getCommentCount(articleId: string) {
    const result = await getDb()
      .select({ count: count() })
      .from(comments)
      .where(eq(comments.articleId, articleId));

    return result[0]?.count || 0;
  }

  async getLikeCount(articleId: string) {
    const result = await getDb()
      .select({ count: count() })
      .from(reactions)
      .where(and(eq(reactions.articleId, articleId), eq(reactions.type, 'like')));

    return result[0]?.count || 0;
  }

  async hasUserLiked(articleId: string, userId: string) {
    const result = await getDb().query.reactions.findFirst({
      where: and(
        eq(reactions.articleId, articleId),
        eq(reactions.userId, userId),
        eq(reactions.type, 'like')
      ),
    });

    return !!result;
  }

  async getUnlikeCount(articleId: string) {
    const result = await getDb()
      .select({ count: count() })
      .from(reactions)
      .where(and(eq(reactions.articleId, articleId), eq(reactions.type, 'unlike')));

    return result[0]?.count || 0;
  }

  async hasUserUnliked(articleId: string, userId: string) {
    const result = await getDb().query.reactions.findFirst({
      where: and(
        eq(reactions.articleId, articleId),
        eq(reactions.userId, userId),
        eq(reactions.type, 'unlike')
      ),
    });

    return !!result;
  }

  async findManyByIdsWithCounts(
    ids: string[],
    userId?: string,
    publishedOnly: boolean = true
  ): Promise<SharedArticle[]> {
    if (!ids || ids.length === 0) return [];

    const whereConditions = [isNull(articles.deletedAt), inArray(articles.id, ids)];

    // Only show published articles if publishedOnly is true
    if (publishedOnly) {
      whereConditions.push(eq(articles.published, true));
    }

    const articlesData = await getDb().query.articles.findMany({
      with: {
        author: {
          columns: { id: true, name: true, email: true, avatar: true },
        },
        articleCategories: {
          with: {
            category: {
              columns: { id: true, name: true, color: true, slug: true },
            },
          },
        },
      },
      where: and(...whereConditions),
    });

    if (articlesData.length === 0) return [];

    const articleIds = articlesData.map((a) => a.id);

    const [
      commentCountsRows,
      likeCountsRows,
      unlikeCountsRows,
      viewCountsRows,
      userLikesRows,
      userUnlikesRows,
    ] = await Promise.all([
      getDb()
        .select({ articleId: comments.articleId, count: count() })
        .from(comments)
        .where(inArray(comments.articleId, articleIds))
        .groupBy(comments.articleId),
      getDb()
        .select({ articleId: reactions.articleId, count: count() })
        .from(reactions)
        .where(and(inArray(reactions.articleId, articleIds), eq(reactions.type, 'like')))
        .groupBy(reactions.articleId),
      getDb()
        .select({ articleId: reactions.articleId, count: count() })
        .from(reactions)
        .where(and(inArray(reactions.articleId, articleIds), eq(reactions.type, 'unlike')))
        .groupBy(reactions.articleId),
      getDb()
        .select({ articleId: articleViews.articleId, count: count() })
        .from(articleViews)
        .where(inArray(articleViews.articleId, articleIds))
        .groupBy(articleViews.articleId),
      userId
        ? getDb()
            .select({ articleId: reactions.articleId })
            .from(reactions)
            .where(
              and(
                inArray(reactions.articleId, articleIds),
                eq(reactions.userId, userId),
                eq(reactions.type, 'like')
              )
            )
        : Promise.resolve([]),
      userId
        ? getDb()
            .select({ articleId: reactions.articleId })
            .from(reactions)
            .where(
              and(
                inArray(reactions.articleId, articleIds),
                eq(reactions.userId, userId),
                eq(reactions.type, 'unlike')
              )
            )
        : Promise.resolve([]),
    ]);

    const toMap = (rows: { articleId: string; count: number }[]) => {
      const map = new Map<string, number>();
      for (const r of rows) map.set(r.articleId, Number(r.count) || 0);
      return map;
    };
    const commentsMap = toMap(commentCountsRows as any);
    const likesMap = toMap(likeCountsRows as any);
    const unlikesMap = toMap(unlikeCountsRows as any);
    const viewsMap = toMap(viewCountsRows as any);
    const userLikesSet = new Set((userLikesRows as any[]).map((r) => r.articleId));
    const userUnlikesSet = new Set((userUnlikesRows as any[]).map((r) => r.articleId));

    const enriched: SharedArticle[] = articlesData.map(
      (article) => {
        const { articleCategories, ...articleData } = article as any;
        return {
          ...articleData,
          categories: articleCategories?.map((ac: any) => ac.category) || [],
          views: viewsMap.get(article.id) || 0,
          _count: {
            comments: commentsMap.get(article.id) || 0,
            likes: likesMap.get(article.id) || 0,
            unlikes: unlikesMap.get(article.id) || 0,
          },
          userHasLiked: userId ? userLikesSet.has(article.id) : false,
          userHasUnliked: userId ? userUnlikesSet.has(article.id) : false,
        } as unknown as SharedArticle;
      }
    );

    // Preserve input order
    const order = new Map(ids.map((id, idx) => [id, idx] as const));
    enriched.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return enriched;
  }
}

export const articleRepository = new ArticleRepository();
