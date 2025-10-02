import { production, siteConfig } from '@/config';

export type CloudflareImageParams = {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: 'auto' | 'avif' | 'webp' | 'jpeg' | 'png';
  fit?: 'scale-down' | 'contain' | 'cover';
};

const normalizeSrc = (src: string) => {
  return src.startsWith('/') ? src.slice(1) : src;
};

/**
 * Build a Cloudflare Image Resizing URL for a locally hosted file.
 * The source path should be the public path (e.g., "/uploads/images/uuid.jpg").
 * This assumes your site is behind Cloudflare and the origin serves the file.
 */
export function cloudflareLoader(src: string, params: CloudflareImageParams = {}): string {
  if (!production) {
    return src;
  }

  const parts: string[] = [];
  if (params.width) parts.push(`width=${params.width}`);
  if (params.height) parts.push(`height=${params.height}`);
  if (params.quality) parts.push(`quality=${params.quality}`);
  parts.push(`format=${params.format || 'auto'}`);
  if (params.fit) parts.push(`fit=${params.fit}`);

  const paramStr = parts.join(',');
  return `${siteConfig.cdn_url}/cdn-cgi/image/${paramStr}/${normalizeSrc(src)}`;
}
