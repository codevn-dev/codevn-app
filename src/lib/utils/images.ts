import { cloudflareLoader } from '@/lib/utils/cdn';

export type NextImageLoaderArgs = { src: string; width: number; quality?: number };

// Next.js Image-compatible loader wrapper for Cloudflare
export function nextCloudflareLoader({ src, width, quality }: NextImageLoaderArgs): string {
  return cloudflareLoader(src, {
    width,
    quality,
    format: 'auto',
    fit: 'cover',
    onerror: 'redirect',
  });
}

// Recommended responsive widths for article thumbnails and content images
export const ARTICLE_IMAGE_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1600];
export const ARTICLE_IMAGE_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

// Build srcset string for article images using Cloudflare URL transforms
export function buildArticleSrcSet(src: string, quality: number = 75): string {
  return ARTICLE_IMAGE_WIDTHS.map((w) => {
    const url = cloudflareLoader(src, {
      width: w,
      quality,
      format: 'auto',
      fit: 'cover',
      onerror: 'redirect',
    });
    return `${url} ${w}w`;
  }).join(', ');
}
