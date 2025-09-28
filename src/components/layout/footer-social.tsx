'use client';

import { siteConfig } from '@/config';
import GitHubIcon from '@/icons/github.svg';
import FacebookIcon from '@/icons/facebook.svg';

interface FooterSocialProps {
  className?: string;
  iconSize?: string;
}

export function FooterSocial({ className = '', iconSize = 'h-4 w-4' }: FooterSocialProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {siteConfig.links.github && (
        <a
          href={siteConfig.links.github}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 transition hover:bg-gray-50"
        >
          <GitHubIcon className={iconSize} />
        </a>
      )}
      {siteConfig.links.facebook && (
        <a
          href={siteConfig.links.facebook}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 transition hover:bg-gray-50"
        >
          <FacebookIcon className={iconSize} />
        </a>
      )}
    </div>
  );
}
