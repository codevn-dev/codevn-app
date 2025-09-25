import { categoryRepository } from '../database/repository';
import { BaseService } from './base';
import { Category } from '@/types/shared/category';
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
        const { createdById, /* createdByName, */ ...categoryWithoutFlatFields } = category;
        return {
          ...categoryWithoutFlatFields,
          createdBy: {
            id: category.createdBy?.id || createdById,
            name: category.createdBy?.name || 'Unknown',
          },
          children: category.children?.map((child: any) => {
            const {
              createdById: childCreatedById,
              /* createdByName: childCreatedByName, */
              ...childWithoutFlatFields
            } = child;
            return {
              ...childWithoutFlatFields,
              createdBy: {
                id: child.createdBy?.id || childCreatedById,
                name: child.createdBy?.name || 'Unknown',
              },
            };
          }),
        };
      }) as unknown as Category[];
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
}

// Export singleton instance
export const categoriesService = new CategoriesService();
