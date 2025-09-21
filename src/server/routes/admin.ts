import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { userRepository, categoryRepository } from '@/lib/database/repository';
import { authMiddleware, AuthenticatedRequest } from '../middleware';

interface UpdateUserRoleBody {
  userId: string;
  role: string;
}

interface CreateCategoryBody {
  name: string;
  description?: string;
  color?: string;
  parentId?: string;
}

interface UpdateCategoryBody {
  id: string;
  name: string;
  description?: string;
  color?: string;
  parentId?: string;
}

function getPaginationParams(request: FastifyRequest) {
  const query = request.query as any;
  const page = Math.max(1, parseInt(query.page || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10')));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function getSortParams(request: FastifyRequest, allowedFields: string[]) {
  const query = request.query as any;
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = (query.sortOrder || 'desc') as 'asc' | 'desc';

  if (!allowedFields.includes(sortBy)) {
    throw new Error(`Invalid sort field. Allowed: ${allowedFields.join(', ')}`);
  }

  return { sortBy, sortOrder };
}

function getSearchParam(request: FastifyRequest): string {
  const query = request.query as any;
  return query.search || '';
}

function requireAdmin(user: any): asserts user is { id: string; role: 'admin' } {
  if (user.role !== 'admin') {
    throw new Error('Admin privileges required');
  }
}

export async function adminRoutes(fastify: FastifyInstance) {
  // Admin users routes
  await fastify.register(async function (fastify) {
    // GET /api/admin/users - Get all users with pagination
    fastify.get(
      '/users',
      {
        preHandler: authMiddleware,
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const authRequest = request as AuthenticatedRequest;
          requireAdmin(authRequest.user!);

          // Extract query parameters
          const query = request.query as any;
          const search = getSearchParam(request);
          const { sortBy: rawSortBy, sortOrder } = getSortParams(request, [
            'createdAt',
            'name',
            'email',
            'joined',
          ]);
          const { page, limit } = getPaginationParams(request);
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

          return reply.send(result);
        } catch (error) {
          console.error('Get admin users error:', error);
          return reply.status(500).send({ error: 'Internal server error' });
        }
      }
    );

    // PUT /api/admin/users - Update user role
    fastify.put<{ Body: UpdateUserRoleBody }>(
      '/users',
      {
        preHandler: authMiddleware,
      },
      async (request: FastifyRequest<{ Body: UpdateUserRoleBody }>, reply: FastifyReply) => {
        try {
          const authRequest = request as AuthenticatedRequest;
          requireAdmin(authRequest.user!);

          const { userId, role } = request.body;

          if (!userId || !role) {
            return reply.status(400).send({ error: 'User ID and role are required' });
          }

          if (!['user', 'admin'].includes(role)) {
            return reply.status(400).send({ error: 'Invalid role. Must be "user" or "admin"' });
          }

          // Get the target user to check their current role
          const targetUser = await userRepository.findById(userId);

          if (!targetUser) {
            return reply.status(404).send({ error: 'User not found' });
          }

          // Prevent admin from updating another admin's role
          if (targetUser.role === 'admin' && targetUser.id !== authRequest.user!.id) {
            return reply.status(403).send({ error: 'You cannot change the role of another admin' });
          }

          const updatedUser = await userRepository.updateRole(userId, role as 'user' | 'admin');

          return reply.send(updatedUser[0]);
        } catch (error) {
          console.error('Update user role error:', error);
          return reply.status(500).send({ error: 'Internal server error' });
        }
      }
    );
  });

  // Admin categories routes
  await fastify.register(async function (fastify) {
    // GET /api/admin/categories - Get all categories for admin
    fastify.get(
      '/categories',
      {
        preHandler: authMiddleware,
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const authRequest = request as AuthenticatedRequest;
          requireAdmin(authRequest.user!);

          const rootCategories = await categoryRepository.findAllForAdmin();
          return reply.send(rootCategories);
        } catch (error) {
          console.error('Get admin categories error:', error);
          return reply.status(500).send({ error: 'Internal server error' });
        }
      }
    );

    // POST /api/admin/categories - Create category
    fastify.post<{ Body: CreateCategoryBody }>(
      '/categories',
      {
        preHandler: authMiddleware,
      },
      async (request: FastifyRequest<{ Body: CreateCategoryBody }>, reply: FastifyReply) => {
        try {
          const authRequest = request as AuthenticatedRequest;
          requireAdmin(authRequest.user!);

          const { name, description, color, parentId } = request.body;

          if (!name) {
            return reply.status(400).send({ error: 'Category name is required' });
          }

          // If parentId is provided, validate it exists
          if (parentId) {
            const parentCategory = await categoryRepository.findById(parentId);

            if (!parentCategory) {
              return reply.status(404).send({ error: 'Parent category not found' });
            }
          }

          const newCategory = await categoryRepository.create({
            name,
            description,
            color,
            parentId,
            createdById: authRequest.user!.id,
          });

          return reply.status(201).send(newCategory[0]);
        } catch (error: any) {
          console.error('Create category error:', error);

          // Handle duplicate key constraint errors
          if (
            error?.cause?.code === '23505' &&
            error?.cause?.constraint_name === 'categories_slug_unique'
          ) {
            return reply.status(400).send({
              error: 'Category with this name already exists. Please choose a different name.',
            });
          }

          // Handle other database constraint errors
          if (error?.cause?.code === '23505') {
            return reply.status(400).send({
              error: 'A category with this information already exists.',
            });
          }

          return reply.status(500).send({ error: 'Internal server error' });
        }
      }
    );

    // PUT /api/admin/categories - Update category
    fastify.put<{ Body: UpdateCategoryBody }>(
      '/categories',
      {
        preHandler: authMiddleware,
      },
      async (request: FastifyRequest<{ Body: UpdateCategoryBody }>, reply: FastifyReply) => {
        try {
          const authRequest = request as AuthenticatedRequest;
          requireAdmin(authRequest.user!);

          const { id, name, description, color, parentId } = request.body;

          if (!id || !name) {
            return reply.status(400).send({ error: 'Category ID and name are required' });
          }

          // Check if category exists
          const existingCategory = await categoryRepository.findById(id);

          if (!existingCategory) {
            return reply.status(404).send({ error: 'Category not found' });
          }

          // If parentId is provided, validate it exists and is not the same as current category
          if (parentId) {
            if (parentId === id) {
              return reply.status(400).send({ error: 'Category cannot be its own parent' });
            }

            const parentCategory = await categoryRepository.findById(parentId);

            if (!parentCategory) {
              return reply.status(404).send({ error: 'Parent category not found' });
            }
          }

          // Update category
          const updatedCategory = await categoryRepository.update(id, {
            name,
            description,
            color: color || existingCategory.color,
            parentId: parentId || null,
          });

          return reply.send(updatedCategory[0]);
        } catch (error: any) {
          console.error('Update category error:', error);

          // Handle duplicate key constraint errors
          if (
            error?.cause?.code === '23505' &&
            error?.cause?.constraint_name === 'categories_slug_unique'
          ) {
            return reply.status(400).send({
              error: 'Category with this name already exists. Please choose a different name.',
            });
          }

          // Handle other database constraint errors
          if (error?.cause?.code === '23505') {
            return reply.status(400).send({
              error: 'A category with this information already exists.',
            });
          }

          return reply.status(500).send({ error: 'Internal server error' });
        }
      }
    );

    // DELETE /api/admin/categories - Delete category
    fastify.delete(
      '/categories',
      {
        preHandler: authMiddleware,
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const authRequest = request as AuthenticatedRequest;
          requireAdmin(authRequest.user!);

          const query = request.query as any;
          const id = query.id;

          if (!id) {
            return reply.status(400).send({ error: 'Category ID is required' });
          }

          // Check if category exists
          const existingCategory = await categoryRepository.findById(id);

          if (!existingCategory) {
            return reply.status(404).send({ error: 'Category not found' });
          }

          // Check if category has children
          const childrenCount = await categoryRepository.getChildrenCount(id);

          if (childrenCount > 0) {
            return reply.status(409).send({
              error:
                'Cannot delete category with child categories. Please delete child categories first.',
            });
          }

          // Check if category has articles
          const articlesCount = await categoryRepository.getArticlesCount(id);

          if (articlesCount > 0) {
            return reply.status(409).send({
              error: 'Cannot delete category with articles. Please move or delete articles first.',
            });
          }

          // Delete category
          await categoryRepository.delete(id);

          return reply.send({ message: 'Category deleted successfully' });
        } catch (error) {
          console.error('Delete category error:', error);
          return reply.status(500).send({ error: 'Internal server error' });
        }
      }
    );
  });
}
