import { notFound } from 'next/navigation';
import { articleRepository } from '@/lib/database/repository';
import { ArticleContent } from '@/features/articles';
import { PreviewGuard } from '@/components/layout';
import { cookies } from 'next/headers';
import { verifyToken } from '@/server/jwt';

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ArticlePage({
  params,
  searchParams,
}: ArticlePageProps & { searchParams: Promise<{ preview?: string }> }) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === 'true';

  // Get current user from JWT token
  let currentUserId: string | null = null;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (token) {
      const decoded = await verifyToken(token);
      if (decoded) {
        currentUserId = decoded.id;
      }
    }
  } catch {
    // Token invalid or expired
    currentUserId = null;
  }

  const article = await articleRepository.findBySlug(slug);

  if (!article) {
    notFound();
  }

  // Check if article is published or if user is previewing their own article
  if (!article.published) {
    if (!isPreview) {
      notFound();
    }

    // For preview mode, let PreviewGuard handle authentication
    // Don't check authentication here to avoid server-side redirect issues
  }

  // Increment view count atomically (safe for many concurrent users)
  articleRepository.incrementViewsById(article.id).catch(() => {});

  // Get comment, like, and unlike counts, and check if user has liked/unliked
  const [commentCount, likeCount, unlikeCount, userHasLiked, userHasUnliked] = await Promise.all([
    articleRepository.getCommentCount(article.id),
    articleRepository.getLikeCount(article.id),
    articleRepository.getUnlikeCount(article.id),
    currentUserId ? articleRepository.hasUserLiked(article.id, currentUserId) : false,
    currentUserId ? articleRepository.hasUserUnliked(article.id, currentUserId) : false,
  ]);

  const author = Array.isArray(article.author) ? article.author[0] : article.author;
  const category = Array.isArray(article.category) ? article.category[0] : article.category;

  const articleWithCounts = {
    ...article,
    thumbnail: article.thumbnail || undefined,
    createdAt: article.createdAt.toISOString(),
    author: {
      id: author?.id || article.authorId,
      name: author?.name || 'Unknown',
      avatar: author?.avatar || null,
    },
    category: category,
    views: (article as unknown as { views?: number }).views ?? 0,
    _count: {
      comments: commentCount,
      likes: likeCount,
      unlikes: unlikeCount,
    },
    userHasLiked,
    userHasUnliked,
  };

  return (
    <PreviewGuard isPreview={isPreview} articleAuthorId={article.authorId}>
      <ArticleContent article={articleWithCounts} isPreview={isPreview} />
    </PreviewGuard>
  );
}
