import { CheckSlugResponse } from '@/types/shared/article';
import { apiPost } from '@/lib/utils';

export function useArticlesActions() {
  const checkSlug = async (slug: string, excludeId?: string) => {
    try {
      return await apiPost<CheckSlugResponse>('/api/articles/check-slug', {
        slug,
        excludeId,
      });
    } catch (error) {
      const _errorMessage = error instanceof Error ? error.message : 'Slug check failed';
      throw new Error(_errorMessage);
    }
  };

  return {
    checkSlug,
  };
}
