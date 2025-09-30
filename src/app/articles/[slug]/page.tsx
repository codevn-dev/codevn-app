import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArticleContentClient } from '@/components/features/articles/article-content.client';
import { PreviewGuard } from '@/components/layout';
import { config } from '@/config';
import { apiGet } from '@/lib/utils/api-client';
import { cookies } from 'next/headers';
import type { Article } from '@/types/shared/article';

export const revalidate = 180; // ISR per-article page: 3 minutes

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

  // Fetch article from API (forward cookies so preview works server-side)
  let article: Article;
  try {
    const endpoint = `/api/articles/slug/${slug}${isPreview ? '?preview=true' : ''}`;
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    // Using apiGet for this simple case
    article = await apiGet<Article>(endpoint, { headers: { cookie: cookieHeader } });
  } catch {
    notFound();
  }

  // Old immediate increment removed in favor of validated tracking

  // Data is already complete from API response, no need for additional queries

  const articleWithCounts = {
    ...article,
    thumbnail: article.thumbnail || undefined,
    createdAt: article.createdAt,
  };

  return (
    <PreviewGuard isPreview={isPreview} articleAuthorId={article.author.id}>
      {/* JSON-LD Structured Data for Article */}
      {(() => {
        const siteUrl = config.api.clientUrl;
        const siteName = (config as any).site?.name || 'CodeVN';
        const url = `${siteUrl}/articles/${article.slug}`;
        const rawImage = (article as any).thumbnail as string | undefined;
        const baseImage = rawImage
          ? rawImage.startsWith('http')
            ? rawImage
            : `${siteUrl}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`
          : `${siteUrl}/logo.svg`;
        const updatedAt = (article as any).updatedAt as Date | undefined;
        const versionParam = updatedAt ? `v=${new Date(updatedAt as any).getTime()}` : undefined;
        const imageWithVersion = versionParam
          ? `${baseImage}${baseImage.includes('?') ? '&' : '?'}${versionParam}`
          : baseImage;
        const image = imageWithVersion.startsWith('http://')
          ? imageWithVersion.replace('http://', 'https://')
          : imageWithVersion;

        const ldJson = {
          '@context': 'https://schema.org',
          '@type': 'Article',
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': url,
          },
          headline: (article as any).title,
          description: (article as any).excerpt || (article as any).summary || '',
          image: [image],
          author: {
            '@type': 'Person',
            name: (article as any).author?.name || 'Unknown',
          },
          publisher: {
            '@type': 'Organization',
            name: siteName,
            logo: {
              '@type': 'ImageObject',
              url: `${siteUrl}/logo.svg`,
            },
          },
          datePublished: ((article as any).createdAt as Date)?.toISOString?.() || undefined,
          dateModified: ((article as any).updatedAt as Date)?.toISOString?.() || undefined,
          articleSection: (article as any).category?.name || undefined,
        };

        return (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
          />
        );
      })()}
      <ArticleContentClient article={articleWithCounts} isPreview={isPreview} />
    </PreviewGuard>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await apiGet<Article>(`/api/articles/slug/${slug}`);

    const siteUrl = config.api.clientUrl;
    const siteName = config.site.name;
    const url = `${siteUrl}/articles/${slug}`;

    const rawImage = (article as any).thumbnail as string | undefined;
    const baseImage = rawImage
      ? rawImage.startsWith('http')
        ? rawImage
        : `${siteUrl}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`
      : `${siteUrl}/logo.svg`;
    // Add cache-busting param from updatedAt, and prefer HTTPS for better compatibility
    const updatedAt = (article as any).updatedAt as Date | undefined;
    const versionParam = updatedAt ? `v=${new Date(updatedAt as any).getTime()}` : undefined;
    const imageWithVersion = versionParam
      ? `${baseImage}${baseImage.includes('?') ? '&' : '?'}${versionParam}`
      : baseImage;
    const image = imageWithVersion.startsWith('http://')
      ? imageWithVersion.replace('http://', 'https://')
      : imageWithVersion;

    const description = (article as any).excerpt || (article as any).summary || '';

    const keywords = [
      (article as any).title,
      (article as any).category?.name,
      (article as any).author?.name,
      siteName,
    ]
      .filter(Boolean)
      .flatMap((k: string) => k.split(/\s+/))
      .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i);

    const twitterSite = process.env.NEXT_PUBLIC_TWITTER_SITE || undefined;
    const twitterCreator = process.env.NEXT_PUBLIC_TWITTER_CREATOR || undefined;

    return {
      title: (article as any).title,
      description: description,
      alternates: {
        canonical: url,
        languages: {
          'vi-VN': url,
          'en-US': url,
        },
      },
      keywords,
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          noimageindex: false,
          'max-snippet': -1,
          'max-image-preview': 'large',
          'max-video-preview': -1,
        },
      },
      openGraph: {
        type: 'article',
        url,
        siteName,
        locale: 'vi_VN',
        title: (article as any).title,
        description,
        images: [
          {
            url: image,
            width: 1200,
            height: 630,
            alt: (article as any).title,
          },
        ],
        authors: [(article as any).author?.name || 'Unknown'],
        tags: [(article as any).category?.name].filter(Boolean) as string[],
        section: (article as any).category?.name,
        publishedTime: ((article as any).createdAt as Date)?.toISOString?.() || undefined,
        modifiedTime: ((article as any).updatedAt as Date)?.toISOString?.() || undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: (article as any).title,
        description,
        images: [image],
        site: twitterSite,
        creator: twitterCreator,
      },
    };
  } catch {
    return {};
  }
}
