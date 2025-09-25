import { getDb } from '..';
import { users, articles, comments, reactions } from '../schema';
import { eq, and, or, ilike, count, desc, asc, isNull, ne } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { authConfig } from '@/config';

export interface UserFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  role?: 'user' | 'admin';
}

export interface PaginatedUsers {
  users: Array<{
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: 'user' | 'admin';
    createdAt: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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

  async create(userData: {
    email: string;
    name: string;
    password: string;
    role?: 'user' | 'admin';
    avatar?: string | null;
  }): Promise<
    Array<{
      id: string;
      email: string;
      name: string;
      avatar: string | null;
      role: 'user' | 'admin';
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
        role: userData.role || 'user',
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
      role?: 'user' | 'admin';
    }
  ): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      avatar: string | null;
      role: 'user' | 'admin';
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

  async updateRole(id: string, role: 'user' | 'admin') {
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

    // Always filter out deleted users
    whereConditions.push(isNull(users.deletedAt));

    // Search condition
    if (search) {
      whereConditions.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)));
    }

    // Role filter
    if (role) {
      whereConditions.push(eq(users.role, role as 'user' | 'admin'));
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
}

export const userRepository = new UserRepository();
