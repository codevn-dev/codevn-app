import { categoryRepository } from '../database/repository';
import { BaseService } from './base';
import { Category, ReorderCategoriesRequest } from '@/types/shared/category';
import { getRedis } from '@/lib/server';

export class CategoriesService extends BaseService {
  /**
   * Get all categories with counts
   */
  async getCategories(): Promise<Category[]> {
    try {
      const redis = getRedis();
      const cacheKey = 'categories:all';

      // Try cache first
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as Category[];
        }
      } catch {
        // ignore cache read errors
      }

      const rootCategories = await categoryRepository.findAllWithCounts();
      const response = rootCategories.map((category: any) => {
        return {
          id: category.id,
          name: category.name,
          description: category.description ?? null,
          slug: category.slug,
          color: category.color,
          order: category.order,
          parentId: category.parentId ?? null,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt ?? category.createdAt,
          createdBy: {
            name: category.createdBy?.name || 'Unknown',
          },
          parent: category.parent
            ? {
                id: category.parent.id,
                name: category.parent.name,
                slug: category.parent.slug,
              }
            : null,
          children: (category.children || []).map((child: any) => ({
            id: child.id,
            name: child.name,
            description: child.description ?? null,
            slug: child.slug,
            color: child.color,
            order: child.order,
            parentId: child.parentId ?? category.id,
            createdAt: child.createdAt,
            updatedAt: child.updatedAt ?? child.createdAt,
            createdBy: {
              name: child.createdBy?.name || 'Unknown',
            },
            parent: child.parent
              ? { id: child.parent.id, name: child.parent.name, slug: child.parent.slug }
              : null,
            _count: {
              articles: child._count?.articles ?? 0,
              children: child._count?.children ?? 0,
            },
          })),
          _count: {
            articles: category._count?.articles ?? 0,
            children: category._count?.children ?? (category.children || []).length,
          },
        } as Category;
      });
      // Store in cache (best-effort)
      try {
        const cacheTTL = 3600; // 60 minutes
        await redis.setex(cacheKey, cacheTTL, JSON.stringify(response));
      } catch {
        // ignore cache write errors
      }

      return response;
    } catch (error) {
      this.handleError(error, 'Get categories');
    }
  }

  /**
   * Reorder categories
   */
  async reorderCategories(reorderData: ReorderCategoriesRequest): Promise<void> {
    try {
      await categoryRepository.reorderCategories(reorderData.categories);
      
      // Clear cache after reordering
      try {
        const redis = getRedis();
        await redis.del('categories:all');
      } catch {
        // ignore cache clear errors
      }
    } catch (error) {
      this.handleError(error, 'Reorder categories');
    }
  }
}

// Export singleton instance
export const categoriesService = new CategoriesService();
