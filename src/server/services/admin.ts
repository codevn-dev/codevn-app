import { userRepository, categoryRepository } from '../database/repository';
import { BaseService } from './base';
import { CreateCategoryRequest, UpdateCategoryRequest, Category } from '@/types/shared/category';
import { UpdateUserRoleRequest, UserListResponse } from '@/types/shared/user';
import { SuccessResponse } from '@/types/shared/common';
import { getRedis } from '@/lib/server';
import { createRedisAuthService } from '../redis';
import { CommonError, AdminError } from '@/types/shared';

export class AdminService extends BaseService {
  /**
   * Get pagination parameters from request
   */
  getPaginationParams(query: any) {
    const page = Math.max(1, parseInt(query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10')));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
  }

  /**
   * Get sort parameters from request
   */
  getSortParams(query: any, allowedFields: string[]) {
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
  getSearchParam(query: any): string {
    return query.search || '';
  }

  /**
   * Require admin role
   */
  requireAdmin(user: any): asserts user is { id: string; role: 'admin' } {
    if (user.role !== 'admin') {
      throw new Error(CommonError.ACCESS_DENIED);
    }
  }

  /**
   * Get all users with pagination
   */
  async getUsers(currentUser: any, query: any): Promise<UserListResponse> {
    try {
      this.requireAdmin(currentUser);

      const search = this.getSearchParam(query);
      const { sortBy: rawSortBy, sortOrder } = this.getSortParams(query, [
        'createdAt',
        'name',
        'email',
        'joined',
      ]);
      const { page, limit } = this.getPaginationParams(query);
      const role = query.role || '';

      // Map 'joined' to 'createdAt' for database compatibility
      const sortBy = rawSortBy === 'joined' ? 'createdAt' : rawSortBy;

      const result = await userRepository.findManyWithPagination({
        search,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
        page,
        limit,
        role: role as 'user' | 'admin' | undefined,
      });

      const response: UserListResponse = {
        users: result.users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          avatar: u.avatar || undefined,
          role: u.role,
          createdAt: u.createdAt as any,
          _count: { articles: 0, comments: 0, likes: 0 },
        })),
        pagination: result.pagination,
      };
      return response;
    } catch (error) {
      this.handleError(error, 'Get admin users');
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(currentUser: any, body: UpdateUserRoleRequest): Promise<any> {
    try {
      this.requireAdmin(currentUser);

      const { userId, role } = body;

      if (!userId || !role) {
        const err: any = new Error(AdminError.MISSING_FIELDS);
        throw err;
      }

      if (!['user', 'admin'].includes(role)) {
        const err: any = new Error(AdminError.INVALID_ROLE);
        throw err;
      }

      // Get the target user to check their current role
      const targetUser = await userRepository.findById(userId);

      if (!targetUser) {
        const err: any = new Error(AdminError.USER_NOT_FOUND);
        throw err;
      }

      // Prevent admin from updating another admin's role
      if (targetUser.role === 'admin' && targetUser.id !== currentUser.id) {
        throw new Error(CommonError.ACCESS_DENIED);
      }

      const updatedUser = await userRepository.updateRole(userId, role as 'user' | 'admin');

      // Invalidate and refresh user profile cache
      const redis = createRedisAuthService();
      await redis.deleteUserProfile(userId);
      await redis.setUserProfile(userId, {
        id: updatedUser[0].id,
        email: updatedUser[0].email,
        name: updatedUser[0].name,
        avatar: updatedUser[0].avatar,
        role: updatedUser[0].role,
        createdAt: new Date().toISOString(),
      });

      return updatedUser[0];
    } catch (error) {
      this.handleError(error, 'Update user role');
    }
  }

  /**
   * Get all categories for admin
   */
  async getCategories(currentUser: any): Promise<Category[]> {
    try {
      this.requireAdmin(currentUser);

      const rootCategories = await categoryRepository.findAllForAdmin();
      return rootCategories as unknown as Category[];
    } catch (error) {
      this.handleError(error, 'Get admin categories');
    }
  }

  /**
   * Create category
   */
  async createCategory(currentUser: any, body: CreateCategoryRequest): Promise<Category> {
    try {
      this.requireAdmin(currentUser);

      const { name, description, color, parentId } = body;

      if (!name) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      // If parentId is provided, validate it exists
      if (parentId) {
        const parentCategory = await categoryRepository.findById(parentId);

        if (!parentCategory) {
          throw new Error(CommonError.NOT_FOUND);
        }
      }

      // Check duplicate name (case-insensitive)
      const nameExists = await categoryRepository.checkNameExists(name);
      if (nameExists) {
        throw new Error(CommonError.CONFLICT);
      }

      const newCategory = await categoryRepository.create({
        name,
        description,
        color,
        parentId,
        createdById: currentUser.id,
      });

      // Invalidate categories cache
      try {
        const redis = getRedis();
        await redis.del('categories:all');
      } catch {}

      return newCategory[0] as unknown as Category;
    } catch (error: any) {
      // Handle duplicate key constraint errors
      if (
        error?.cause?.code === '23505' &&
        error?.cause?.constraint_name === 'categories_slug_unique'
      ) {
        throw new Error(CommonError.CONFLICT);
      }

      // Handle other database constraint errors
      if (error?.cause?.code === '23505') {
        throw new Error(CommonError.CONFLICT);
      }

      this.handleError(error, 'Create category');
    }
  }

  /**
   * Update category
   */
  async updateCategory(currentUser: any, body: UpdateCategoryRequest): Promise<Category> {
    try {
      this.requireAdmin(currentUser);

      const { id, name, description, color, parentId } = body;

      if (!id || !name) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      // Check if category exists
      const existingCategory = await categoryRepository.findById(id);

      if (!existingCategory) {
        throw new Error(CommonError.NOT_FOUND);
      }

      // If parentId is provided, validate it exists and is not the same as current category
      if (parentId) {
        if (parentId === id) {
          throw new Error(CommonError.BAD_REQUEST);
        }

        const parentCategory = await categoryRepository.findById(parentId);

        if (!parentCategory) {
          throw new Error(CommonError.NOT_FOUND);
        }
      }

      // Check duplicate name (case-insensitive), excluding current category
      const nameExists = await categoryRepository.checkNameExists(name, id);
      if (nameExists) {
        throw new Error(CommonError.CONFLICT);
      }

      // Update category
      const updatedCategory = await categoryRepository.update(id, {
        name,
        description,
        color: color || existingCategory.color,
        parentId: parentId || null,
      });

      // Invalidate categories cache
      try {
        const redis = getRedis();
        await redis.del('categories:all');
      } catch {}

      return updatedCategory[0] as unknown as Category;
    } catch (error: any) {
      // Handle duplicate key constraint errors
      if (
        error?.cause?.code === '23505' &&
        error?.cause?.constraint_name === 'categories_slug_unique'
      ) {
        throw new Error(CommonError.CONFLICT);
      }

      // Handle other database constraint errors
      if (error?.cause?.code === '23505') {
        throw new Error(CommonError.CONFLICT);
      }

      this.handleError(error, 'Update category');
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(currentUser: any, categoryId: string): Promise<SuccessResponse> {
    try {
      this.requireAdmin(currentUser);

      if (!categoryId) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      // Check if category exists
      const existingCategory = await categoryRepository.findById(categoryId);

      if (!existingCategory) {
        throw new Error(CommonError.NOT_FOUND);
      }

      // Check if category has children
      const childrenCount = await categoryRepository.getChildrenCount(categoryId);

      if (childrenCount > 0) {
        throw new Error(CommonError.CONFLICT);
      }

      // Check if category has articles
      const articlesCount = await categoryRepository.getArticlesCount(categoryId);

      if (articlesCount > 0) {
        throw new Error(CommonError.CONFLICT);
      }

      // Delete category
      await categoryRepository.delete(categoryId);

      // Invalidate categories cache
      try {
        const redis = getRedis();
        await redis.del('categories:all');
      } catch {}

      return { success: true };
    } catch (error: any) {
      // Handle specific database constraint violations
      if (error?.cause?.code === '23503') {
        // Foreign key constraint violation
        const constraintName = error?.cause?.constraint_name;

        if (constraintName?.includes('articles')) {
          throw new Error(CommonError.CONFLICT);
        } else if (constraintName?.includes('categories')) {
          throw new Error(CommonError.CONFLICT);
        } else {
          throw new Error(CommonError.CONFLICT);
        }
      }

      // Handle other database errors
      if (error?.cause?.code === '23505') {
        throw new Error(CommonError.CONFLICT);
      }

      // Re-throw custom error messages
      if (error.message && !error.message.includes('Database operation failed')) {
        throw error;
      }

      // Handle generic database errors
      this.handleError(error, 'Delete category');
    }
  }
}

// Export singleton instance
export const adminService = new AdminService();
