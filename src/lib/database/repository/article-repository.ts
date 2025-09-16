import { getDb } from '..';
import { articles, comments, reactions } from '../schema';
import { and, eq, or, like, isNull, gt, sql, count } from 'drizzle-orm';

export interface ArticleFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  status?: 'all' | 'published' | 'draft';
  categoryId?: string;
  authorId?: string;
  publishedOnly?: boolean;
  userId?: string; // For checking user like/unlike status
}

export interface PaginatedArticles {
  articles: any[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

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
        category: {
          columns: {
            id: true,
            name: true,
            color: true,
            slug: true,
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
        category: {
          columns: {
            id: true,
            name: true,
            color: true,
            slug: true,
          },
        },
      },
    });
  }

  async incrementViewsById(id: string) {
    await getDb()
      .update(articles)
      .set({ views: sql`${articles.views} + 1` })
      .where(eq(articles.id, id));
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
      categoryId = '',
      authorId = '',
      publishedOnly = true,
    } = filters;

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];

    // Always filter out deleted articles
    whereConditions.push(isNull(articles.deletedAt));

    if (search) {
      whereConditions.push(
        or(like(articles.title, `%${search}%`), like(articles.content, `%${search}%`))
      );
    }

    if (status !== 'all') {
      whereConditions.push(eq(articles.published, status === 'published'));
    }

    if (categoryId) {
      whereConditions.push(eq(articles.categoryId, categoryId));
    }

    if (authorId) {
      whereConditions.push(eq(articles.authorId, authorId));
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
        category: {
          columns: {
            id: true,
            name: true,
            color: true,
            slug: true,
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

    // Get comment, like, and unlike counts for each article
    const articlesWithCounts = await Promise.all(
      articlesData.map(async (article) => {
        const [commentCount, likeCount, unlikeCount, userHasLiked, userHasUnliked] =
          await Promise.all([
            getDb()
              .select({ count: count() })
              .from(comments)
              .where(eq(comments.articleId, article.id)),
            getDb()
              .select({ count: count() })
              .from(reactions)
              .where(and(eq(reactions.articleId, article.id), eq(reactions.type, 'like'))),
            getDb()
              .select({ count: count() })
              .from(reactions)
              .where(and(eq(reactions.articleId, article.id), eq(reactions.type, 'unlike'))),
            userId
              ? getDb().query.reactions.findFirst({
                  where: and(
                    eq(reactions.articleId, article.id),
                    eq(reactions.userId, userId),
                    eq(reactions.type, 'like')
                  ),
                })
              : null,
            userId
              ? getDb().query.reactions.findFirst({
                  where: and(
                    eq(reactions.articleId, article.id),
                    eq(reactions.userId, userId),
                    eq(reactions.type, 'unlike')
                  ),
                })
              : null,
          ]);

        return {
          ...article,
          _count: {
            comments: commentCount[0]?.count || 0,
            likes: likeCount[0]?.count || 0,
            unlikes: unlikeCount[0]?.count || 0,
          },
          userHasLiked: !!userHasLiked,
          userHasUnliked: !!userHasUnliked,
        };
      })
    );

    return {
      articles: articlesWithCounts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async create(articleData: {
    title: string;
    content: string;
    slug: string;
    thumbnail?: string;
    categoryId: string;
    authorId: string;
    published?: boolean;
  }) {
    return await getDb()
      .insert(articles)
      .values({
        title: articleData.title,
        content: articleData.content,
        slug: articleData.slug,
        thumbnail: articleData.thumbnail,
        categoryId: articleData.categoryId,
        authorId: articleData.authorId,
        published: articleData.published || false,
      })
      .returning();
  }

  async update(
    id: string,
    updateData: {
      title?: string;
      content?: string;
      slug?: string;
      thumbnail?: string;
      categoryId?: string;
      published?: boolean;
    }
  ) {
    const dataToUpdate: any = { ...updateData };
    if (Object.keys(dataToUpdate).length > 0) {
      dataToUpdate.updatedAt = new Date();
    }

    await getDb().update(articles).set(dataToUpdate).where(eq(articles.id, id));

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
}

export const articleRepository = new ArticleRepository();
