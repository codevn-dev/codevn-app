'use client';

import dynamic from 'next/dynamic';
import type { Article } from '@/types/shared';

const ArticleContent = dynamic(() => import('./article-content').then((m) => m.ArticleContent), {
  ssr: false,
});

export function ArticleContentClient(props: { article: Article; isPreview?: boolean }) {
  return <ArticleContent {...props} />;
}

export default ArticleContentClient;
