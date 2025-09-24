import { getDb } from '..';
import { comments, reactions } from '../schema';
import { eq, and, desc, asc, count, sql, isNull } from 'drizzle-orm';
import { Comment as SharedComment } from '@/types/shared/comment';

export interface CommentFilters {
  articleId?: string;
  parentId?: string | null;
  authorId?: string;
  sortBy?: 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  userId?: string; // For checking user like/unlike status
}

export interface PaginatedComments {
  comments: SharedComment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class CommentRepository {
  async findById(id: string) {
    return await getDb().query.comments.findFirst({
      where: and(eq(comments.id, id), isNull(comments.deletedAt)),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        article: {
          columns: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });
  }

  async findByArticle(articleId: string, filters: CommentFilters = {}): Promise<PaginatedComments> {
    const {
      parentId = null,
      sortBy = 'createdAt',
      sortOrder = 'asc',
      page = 1,
      limit = 50,
      userId,
    } = filters;

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(comments.articleId, articleId), isNull(comments.deletedAt)];

    if (parentId !== undefined) {
      if (parentId === null) {
        whereConditions.push(sql`${comments.parentId} IS NULL`);
      } else {
        whereConditions.push(eq(comments.parentId, parentId));
      }
    }

    const whereClause = and(...whereConditions);

    // Get total count
    const totalCountResult = await getDb()
      .select({ count: count() })
      .from(comments)
      .where(whereClause);

    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Get comments with relations
    const commentsData = await getDb().query.comments.findMany({
      where: whereClause,
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: sortOrder === 'desc' ? [desc(comments[sortBy])] : [asc(comments[sortBy])],
      limit,
      offset,
    });

    // Add reply count, like/unlike counts, and user status for each comment
    const commentsWithCounts: SharedComment[] = await Promise.all(
      commentsData.map(async (comment) => {
        const [replyCount, likeCount, unlikeCount, userHasLiked, userHasUnliked] =
          await Promise.all([
            this.getCommentCountByParent(articleId, comment.id),
            getDb()
              .select({ count: count() })
              .from(reactions)
              .where(and(eq(reactions.commentId, comment.id), eq(reactions.type, 'like'))),
            getDb()
              .select({ count: count() })
              .from(reactions)
              .where(and(eq(reactions.commentId, comment.id), eq(reactions.type, 'unlike'))),
            userId
              ? getDb().query.reactions.findFirst({
                  where: and(
                    eq(reactions.commentId, comment.id),
                    eq(reactions.userId, userId),
                    eq(reactions.type, 'like')
                  ),
                })
              : null,
            userId
              ? getDb().query.reactions.findFirst({
                  where: and(
                    eq(reactions.commentId, comment.id),
                    eq(reactions.userId, userId),
                    eq(reactions.type, 'unlike')
                  ),
                })
              : null,
          ]);

        return {
          ...comment,
          replyCount,
          likeCount: likeCount[0]?.count || 0,
          unlikeCount: unlikeCount[0]?.count || 0,
          userHasLiked: !!userHasLiked,
          userHasUnliked: !!userHasUnliked,
          _count: {
            replies: replyCount,
            likes: likeCount[0]?.count || 0,
          },
        } as unknown as SharedComment;
      })
    );

    return {
      comments: commentsWithCounts,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    };
  }

  async create(commentData: {
    content: string;
    articleId: string;
    authorId: string;
    parentId?: string | null;
  }) {
    return await getDb()
      .insert(comments)
      .values({
        content: commentData.content,
        articleId: commentData.articleId,
        authorId: commentData.authorId,
        parentId: commentData.parentId || null,
      })
      .returning();
  }

  async update(id: string, content: string) {
    return await getDb()
      .update(comments)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(comments.id, id))
      .returning();
  }

  async delete(id: string) {
    // Soft delete: set deleted_at timestamp instead of actually deleting
    return await getDb()
      .update(comments)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(comments.id, id));
  }

  async getCommentCount(articleId: string) {
    const result = await getDb()
      .select({ count: count() })
      .from(comments)
      .where(and(eq(comments.articleId, articleId), isNull(comments.deletedAt)));

    return result[0]?.count || 0;
  }

  async getCommentCountByParent(articleId: string, parentId: string | null) {
    const whereConditions = [eq(comments.articleId, articleId), isNull(comments.deletedAt)];

    if (parentId === null) {
      whereConditions.push(sql`${comments.parentId} IS NULL`);
    } else {
      whereConditions.push(eq(comments.parentId, parentId));
    }

    const result = await getDb()
      .select({ count: count() })
      .from(comments)
      .where(and(...whereConditions));

    return result[0]?.count || 0;
  }

  async findByAuthor(authorId: string, limit = 10) {
    return await getDb().query.comments.findMany({
      where: and(eq(comments.authorId, authorId), isNull(comments.deletedAt)),
      with: {
        article: {
          columns: {
            id: true,
            title: true,
            slug: true,
          },
        },
        author: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: [desc(comments.createdAt)],
      limit,
    });
  }

  async deleteByArticle(articleId: string) {
    // Soft delete: set deleted_at timestamp instead of actually deleting
    return await getDb()
      .update(comments)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(comments.articleId, articleId));
  }

  async deleteByAuthor(authorId: string) {
    // Soft delete: set deleted_at timestamp instead of actually deleting
    return await getDb()
      .update(comments)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(comments.authorId, authorId));
  }
}

export const commentRepository = new CommentRepository();
