import { getDb } from '..';
import { users, articles, comments, reactions, articleViews } from '../schema';
import { eq, and, or, ilike, count, desc, asc, isNull, ne, gte, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { authConfig } from '@/config';
import { UserFilters, PaginatedUsers } from '@/types/shared/user';
import { RoleLevel, UserRole } from '@/types/shared';

export class UserRepository {
  async findById(id: string) {
    return await getDb().query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
    });
  }

  async findByEmail(email: string) {
    return await getDb().query.users.findFirst({
      where: and(eq(users.email, email), isNull(users.deletedAt)),
    });
  }

  async findByRole(role: UserRole) {
    return await getDb().query.users.findMany({
      where: and(eq(users.role, role), isNull(users.deletedAt)),
      orderBy: [desc(users.createdAt)],
    });
  }

  async create(userData: {
    email: string;
    name: string;
    password: string;
    role?: UserRole;
    avatar?: string | null;
  }): Promise<
    Array<{
      id: string;
      email: string;
      name: string;
      avatar: string | null;
      role: UserRole;
      createdAt: Date;
    }>
  > {
    const hashedPassword = await bcrypt.hash(userData.password, authConfig.bcryptSaltRounds);

    return await getDb()
      .insert(users)
      .values({
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        role: userData.role || RoleLevel.member,
        avatar: userData.avatar || null,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        avatar: users.avatar,
        role: users.role,
        createdAt: users.createdAt,
      });
  }

  async update(
    id: string,
    updateData: {
      name?: string;
      email?: string;
      avatar?: string | null;
      role?: UserRole;
    }
  ): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      avatar: string | null;
      role: UserRole;
      createdAt: Date;
    }>
  > {
    const dataToUpdate: any = { ...updateData };
    if (Object.keys(dataToUpdate).length > 0) {
      dataToUpdate.updatedAt = new Date();
    }

    return await getDb().update(users).set(dataToUpdate).where(eq(users.id, id)).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      role: users.role,
      createdAt: users.createdAt,
    });
  }

  async updateRole(id: string, role: UserRole) {
    return await getDb()
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        role: users.role,
        createdAt: users.createdAt,
      });
  }

  async findManyWithPagination(filters: UserFilters): Promise<PaginatedUsers> {
    const {
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
      role = '',
    } = filters;

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];

    // Always filter out deleted users and system users
    whereConditions.push(isNull(users.deletedAt));
    whereConditions.push(ne(users.role, 'system'));

    // Search condition
    if (search) {
      whereConditions.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)));
    }

    // Role filter
    if (role) {
      whereConditions.push(eq(users.role, role as UserRole));
    }

    // Build order by clause
    const orderBy =
      sortBy === 'name'
        ? sortOrder === 'asc'
          ? asc(users.name)
          : desc(users.name)
        : sortOrder === 'asc'
          ? asc(users.createdAt)
          : desc(users.createdAt);

    // Build where clause
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count for pagination
    const [countResult] = await getDb().select({ total: count() }).from(users).where(whereClause);

    const total = countResult.total;

    // Get paginated results
    const usersResult = await getDb()
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);

    return {
      users: usersResult,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findAllExcept(excludeId: string, limit: number = 50) {
    return await getDb()
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        role: users.role,
      })
      .from(users)
      .where(and(ne(users.id, excludeId), isNull(users.deletedAt)))
      .limit(limit);
  }

  async delete(id: string) {
    // Soft delete: set deleted_at timestamp instead of actually deleting
    return await getDb()
      .update(users)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async getUserStatistics(userId: string) {
    const [articleCount, totalLikes, totalDislikes, totalComments] = await Promise.all([
      // Count total articles by user
      getDb().select({ count: count() }).from(articles).where(eq(articles.authorId, userId)),

      // Count total likes on user's articles (not comment likes)
      getDb()
        .select({ count: count() })
        .from(reactions)
        .innerJoin(articles, eq(reactions.articleId, articles.id))
        .where(
          and(
            eq(articles.authorId, userId),
            eq(reactions.type, 'like'),
            isNull(reactions.commentId) // Only article likes, not comment likes
          )
        ),

      // Count total dislikes on user's articles (not comment dislikes)
      getDb()
        .select({ count: count() })
        .from(reactions)
        .innerJoin(articles, eq(reactions.articleId, articles.id))
        .where(
          and(
            eq(articles.authorId, userId),
            eq(reactions.type, 'unlike'),
            isNull(reactions.commentId) // Only article dislikes, not comment dislikes
          )
        ),

      // Count total comments on user's articles
      getDb()
        .select({ count: count() })
        .from(comments)
        .innerJoin(articles, eq(comments.articleId, articles.id))
        .where(eq(articles.authorId, userId)),
    ]);

    return {
      totalArticles: articleCount[0]?.count || 0,
      totalLikes: totalLikes[0]?.count || 0,
      totalDislikes: totalDislikes[0]?.count || 0,
      totalComments: totalComments[0]?.count || 0,
    };
  }

  /**
   * Get all users with basic info for leaderboard
   */
  async getAllUsersForLeaderboard() {
    const db = getDb();
    return await db
      .select({
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users);
  }

  /**
   * Get users who have published articles (more efficient for leaderboard)
   */
  async getActiveUsersForLeaderboard() {
    const db = getDb();
    return await db
      .selectDistinct({
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(articles, eq(articles.authorId, users.id))
      .where(and(eq(articles.published, true), isNull(articles.deletedAt)));
  }

  /**
   * Batch get user statistics for multiple users
   */
  async getBatchUserStats(userIds: string[], startDate?: Date | null) {
    const db = getDb();

    // Build date conditions
    const dateConditions = startDate ? [gte(articles.createdAt, startDate)] : [];
    const viewDateConditions = startDate ? [gte(articleViews.createdAt, startDate)] : [];

    // Batch queries for all users at once
    const [articleCounts, likeCounts, dislikeCounts, commentCounts, viewCounts] = await Promise.all(
      [
        // Articles count per user
        db
          .select({ authorId: articles.authorId, count: count() })
          .from(articles)
          .where(
            and(
              eq(articles.published, true),
              ...dateConditions,
              inArray(articles.authorId, userIds)
            )
          )
          .groupBy(articles.authorId),

        // Likes count per user
        db
          .select({ authorId: articles.authorId, count: count() })
          .from(reactions)
          .innerJoin(articles, eq(reactions.articleId, articles.id))
          .where(
            and(
              eq(reactions.type, 'like'),
              isNull(reactions.commentId),
              eq(articles.published, true),
              ...dateConditions,
              inArray(articles.authorId, userIds)
            )
          )
          .groupBy(articles.authorId),

        // Dislikes count per user
        db
          .select({ authorId: articles.authorId, count: count() })
          .from(reactions)
          .innerJoin(articles, eq(reactions.articleId, articles.id))
          .where(
            and(
              eq(reactions.type, 'unlike'),
              isNull(reactions.commentId),
              eq(articles.published, true),
              ...dateConditions,
              inArray(articles.authorId, userIds)
            )
          )
          .groupBy(articles.authorId),

        // Comments count per user (comments on their articles)
        db
          .select({ authorId: articles.authorId, count: count() })
          .from(comments)
          .innerJoin(articles, eq(comments.articleId, articles.id))
          .where(
            and(
              eq(articles.published, true),
              ...dateConditions,
              inArray(articles.authorId, userIds)
            )
          )
          .groupBy(articles.authorId),

        // Views count per user
        db
          .select({ authorId: articles.authorId, count: count() })
          .from(articleViews)
          .innerJoin(articles, eq(articleViews.articleId, articles.id))
          .where(
            and(
              eq(articles.published, true),
              ...viewDateConditions,
              inArray(articles.authorId, userIds)
            )
          )
          .groupBy(articles.authorId),
      ]
    );

    // Convert to maps for fast lookup
    const toMap = (rows: { authorId: string; count: number }[]) => {
      const map = new Map<string, number>();
      for (const row of rows) {
        map.set(row.authorId, Number(row.count) || 0);
      }
      return map;
    };

    const articlesMap = toMap(articleCounts);
    const likesMap = toMap(likeCounts);
    const dislikesMap = toMap(dislikeCounts);
    const commentsMap = toMap(commentCounts);
    const viewsMap = toMap(viewCounts);

    // Return stats for each user
    return userIds.map((userId) => ({
      userId,
      posts: articlesMap.get(userId) || 0,
      likes: likesMap.get(userId) || 0,
      dislikes: dislikesMap.get(userId) || 0,
      comments: commentsMap.get(userId) || 0,
      views: viewsMap.get(userId) || 0,
    }));
  }

  /**
   * Get user's article count within a date range
   */
  async getUserArticleCount(userId: string, startDate?: Date | null) {
    const db = getDb();
    const conditions = [eq(articles.authorId, userId), eq(articles.published, true)];

    if (startDate) {
      conditions.push(gte(articles.createdAt, startDate));
    }

    const result = await db
      .select({ count: count() })
      .from(articles)
      .where(and(...conditions));

    return result[0]?.count || 0;
  }

  /**
   * Get user's likes count within a date range
   */
  async getUserLikesCount(userId: string, startDate?: Date | null) {
    const db = getDb();
    const conditions = [
      eq(articles.authorId, userId),
      eq(reactions.type, 'like'),
      isNull(reactions.commentId),
      eq(articles.published, true),
    ];

    if (startDate) {
      conditions.push(gte(articles.createdAt, startDate));
    }

    const result = await db
      .select({ count: count() })
      .from(reactions)
      .innerJoin(articles, eq(reactions.articleId, articles.id))
      .where(and(...conditions));

    return result[0]?.count || 0;
  }

  /**
   * Get user's dislikes count within a date range
   */
  async getUserDislikesCount(userId: string, startDate?: Date | null) {
    const db = getDb();
    const conditions = [
      eq(articles.authorId, userId),
      eq(reactions.type, 'unlike'),
      isNull(reactions.commentId),
      eq(articles.published, true),
    ];

    if (startDate) {
      conditions.push(gte(articles.createdAt, startDate));
    }

    const result = await db
      .select({ count: count() })
      .from(reactions)
      .innerJoin(articles, eq(reactions.articleId, articles.id))
      .where(and(...conditions));

    return result[0]?.count || 0;
  }

  /**
   * Get user's comments count within a date range
   */
  async getUserCommentsCount(userId: string, startDate?: Date | null) {
    const db = getDb();
    const conditions = [eq(articles.authorId, userId), eq(articles.published, true)];

    if (startDate) {
      conditions.push(gte(articles.createdAt, startDate));
    }

    const result = await db
      .select({ count: count() })
      .from(comments)
      .innerJoin(articles, eq(comments.articleId, articles.id))
      .where(and(...conditions));

    return result[0]?.count || 0;
  }

  /**
   * Get user's views count within a date range
   */
  async getUserViewsCount(userId: string, startDate?: Date | null) {
    const db = getDb();
    const conditions = [eq(articles.authorId, userId), eq(articles.published, true)];

    if (startDate) {
      conditions.push(gte(articleViews.createdAt, startDate));
    }

    const result = await db
      .select({ count: count() })
      .from(articleViews)
      .innerJoin(articles, eq(articleViews.articleId, articles.id))
      .where(and(...conditions));

    return result[0]?.count || 0;
  }

  /**
   * Check if there are any users in the system (database only)
   */
  async hasAnyUsers(): Promise<boolean> {
    const db = getDb();
    const result = await db.select({ count: count() }).from(users).where(isNull(users.deletedAt));

    return (result[0]?.count || 0) > 0;
  }
}

export const userRepository = new UserRepository();
