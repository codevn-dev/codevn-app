'use client';

import { ArticleContent } from './article-content';
import type { Article } from '@/types/shared';

interface ArticleContentClientProps {
  article: Article;
  isPreview?: boolean;
  initialRelatedArticles?: any[];
  initialCategories?: any[];
}

export function ArticleContentClient(props: ArticleContentClientProps) {
  return <ArticleContent {...props} />;
}

export default ArticleContentClient;
