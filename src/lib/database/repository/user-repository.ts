import { getDb } from '..';
import { users } from '../schema';
import { eq, and, or, ilike, count, desc, asc, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export interface UserFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  role?: 'user' | 'admin';
}

export interface PaginatedUsers {
  users: any[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
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
  }) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    return await getDb()
      .insert(users)
      .values({
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        role: userData.role || 'user',
      })
      .returning();
  }

  async update(
    id: string,
    updateData: {
      name?: string;
      email?: string;
      avatar?: string | null;
      role?: 'user' | 'admin';
    }
  ) {
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
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      users: usersResult,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
      },
    };
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
}

export const userRepository = new UserRepository();
