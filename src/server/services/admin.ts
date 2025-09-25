import { userRepository, categoryRepository } from '../database/repository';
import { BaseService } from './base';
import { CreateCategoryRequest, UpdateCategoryRequest, Category } from '@/types/shared/category';
import { UpdateUserRoleRequest, UserListResponse } from '@/types/shared/user';
import { SuccessResponse } from '@/types/shared/common';
import { getRedis } from '@/lib/server';
import { createRedisAuthService } from '../redis';

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
      throw new Error(`Invalid sort field. Allowed: ${allowedFields.join(', ')}`);
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
      throw new Error('Admin privileges required');
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
        throw new Error('User ID and role are required');
      }

      if (!['user', 'admin'].includes(role)) {
        throw new Error('Invalid role. Must be "user" or "admin"');
      }

      // Get the target user to check their current role
      const targetUser = await userRepository.findById(userId);

      if (!targetUser) {
        throw new Error('User not found');
      }

      // Prevent admin from updating another admin's role
      if (targetUser.role === 'admin' && targetUser.id !== currentUser.id) {
        throw new Error('You cannot change the role of another admin');
      }

      const updatedUser = await userRepository.updateRole(userId, role as 'user' | 'admin');

      // Invalidate user profile cache
      const redis = createRedisAuthService();
      await redis.deleteUserProfile(userId);

      // Update user data in all active tokens (Cách 2: không logout user)
      const updatedUserData = {
        id: updatedUser[0].id,
        email: updatedUser[0].email,
        name: updatedUser[0].name,
        avatar: null, // updateRole doesn't return avatar, will be updated from profile cache
        role: updatedUser[0].role,
      };
      await redis.updateUserInAllTokens(userId, updatedUserData);

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
        throw new Error('Category name is required');
      }

      // If parentId is provided, validate it exists
      if (parentId) {
        const parentCategory = await categoryRepository.findById(parentId);

        if (!parentCategory) {
          throw new Error('Parent category not found');
        }
      }

      // Check duplicate name (case-insensitive)
      const nameExists = await categoryRepository.checkNameExists(name);
      if (nameExists) {
        throw new Error('Category name already exists. Please choose a different name.');
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
        throw new Error('Category with this name already exists. Please choose a different name.');
      }

      // Handle other database constraint errors
      if (error?.cause?.code === '23505') {
        throw new Error('A category with this information already exists.');
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
        throw new Error('Category ID and name are required');
      }

      // Check if category exists
      const existingCategory = await categoryRepository.findById(id);

      if (!existingCategory) {
        throw new Error('Category not found');
      }

      // If parentId is provided, validate it exists and is not the same as current category
      if (parentId) {
        if (parentId === id) {
          throw new Error('Category cannot be its own parent');
        }

        const parentCategory = await categoryRepository.findById(parentId);

        if (!parentCategory) {
          throw new Error('Parent category not found');
        }
      }

      // Check duplicate name (case-insensitive), excluding current category
      const nameExists = await categoryRepository.checkNameExists(name, id);
      if (nameExists) {
        throw new Error('Category name already exists. Please choose a different name.');
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
        throw new Error('Category with this name already exists. Please choose a different name.');
      }

      // Handle other database constraint errors
      if (error?.cause?.code === '23505') {
        throw new Error('A category with this information already exists.');
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
        throw new Error('Category ID is required');
      }

      // Check if category exists
      const existingCategory = await categoryRepository.findById(categoryId);

      if (!existingCategory) {
        throw new Error('Category not found');
      }

      // Check if category has children
      const childrenCount = await categoryRepository.getChildrenCount(categoryId);

      if (childrenCount > 0) {
        throw new Error(
          'Cannot delete category with child categories. Please delete child categories first.'
        );
      }

      // Check if category has articles
      const articlesCount = await categoryRepository.getArticlesCount(categoryId);

      if (articlesCount > 0) {
        throw new Error(
          'Cannot delete category with articles. Please move or delete articles first.'
        );
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
          throw new Error(
            'Cannot delete category because it has associated articles. Please move or delete the articles first.'
          );
        } else if (constraintName?.includes('categories')) {
          throw new Error(
            'Cannot delete category because it has child categories. Please delete child categories first.'
          );
        } else {
          throw new Error(
            'Cannot delete category due to database relationships. Please check for associated data.'
          );
        }
      }

      // Handle other database errors
      if (error?.cause?.code === '23505') {
        throw new Error('Category deletion failed due to database constraints.');
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
