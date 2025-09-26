import { getDb } from '..';
import { comments, reactions } from '../schema';
import { eq, and, desc, asc, count, sql, isNull, inArray } from 'drizzle-orm';
import { Comment as SharedComment } from '@/types/shared/comment';
import { CommentFilters, PaginatedComments } from '@/types/shared/comment';

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

    // Batch reply/like/unlike counts and user reaction flags to avoid N+1
    const commentIds = commentsData.map((c) => c.id);

    const [likeCountsRows, unlikeCountsRows, userLikedRows, userUnlikedRows] = await Promise.all([
      getDb()
        .select({ commentId: reactions.commentId, count: count() })
        .from(reactions)
        .where(and(inArray(reactions.commentId, commentIds), eq(reactions.type, 'like')))
        .groupBy(reactions.commentId),
      getDb()
        .select({ commentId: reactions.commentId, count: count() })
        .from(reactions)
        .where(and(inArray(reactions.commentId, commentIds), eq(reactions.type, 'unlike')))
        .groupBy(reactions.commentId),
      userId
        ? getDb()
            .select({ commentId: reactions.commentId })
            .from(reactions)
            .where(
              and(
                inArray(reactions.commentId, commentIds),
                eq(reactions.userId, userId),
                eq(reactions.type, 'like')
              )
            )
        : Promise.resolve([]),
      userId
        ? getDb()
            .select({ commentId: reactions.commentId })
            .from(reactions)
            .where(
              and(
                inArray(reactions.commentId, commentIds),
                eq(reactions.userId, userId),
                eq(reactions.type, 'unlike')
              )
            )
        : Promise.resolve([]),
    ]);

    const toCountMap = (
      rows: { commentId: string; count: number }[],
      key: 'commentId' | 'parentId' = 'commentId'
    ) => {
      const map = new Map<string, number>();
      for (const r of rows as any[]) {
        const id = (r as any)[key] as string;
        map.set(id, Number(r.count) || 0);
      }
      return map;
    };
    // Compute replies by counting children per parent among the fetched ids
    const repliesCountMap = new Map<string, number>();
    {
      const rows = await getDb()
        .select({ parentId: comments.parentId, count: count() })
        .from(comments)
        .where(and(eq(comments.articleId, articleId)))
        .groupBy(comments.parentId);
      for (const r of rows as any[]) {
        if (!r.parentId) continue;
        repliesCountMap.set(r.parentId as string, Number(r.count) || 0);
      }
    }
    const likesMap = toCountMap(likeCountsRows as any);
    const unlikesMap = toCountMap(unlikeCountsRows as any);
    const userLikedSet = new Set((userLikedRows as any[]).map((r) => r.commentId));
    const userUnlikedSet = new Set((userUnlikedRows as any[]).map((r) => r.commentId));

    const commentsWithCounts: SharedComment[] = commentsData.map((comment) => {
      const replyCount = repliesCountMap.get(comment.id) || 0;
      const likeCount = likesMap.get(comment.id) || 0;
      const unlikeCount = unlikesMap.get(comment.id) || 0;
      return {
        ...comment,
        replyCount,
        likeCount,
        unlikeCount,
        userHasLiked: userId ? userLikedSet.has(comment.id) : false,
        userHasUnliked: userId ? userUnlikedSet.has(comment.id) : false,
        _count: {
          replies: replyCount,
          likes: likeCount,
        },
      } as unknown as SharedComment;
    });

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
