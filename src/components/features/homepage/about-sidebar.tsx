'use client';

import Link from 'next/link';
import { siteConfig } from '@/config/config';
import { ExternalLink } from 'lucide-react';
import GitHubIcon from '@/icons/github.svg';
import FacebookIcon from '@/icons/facebook.svg';
import { useI18n } from '@/components/providers';

interface AboutSidebarProps {
  mounted: boolean;
}

export function AboutSidebar({ mounted }: AboutSidebarProps) {
  const { t } = useI18n();

  return (
    <div className="xl:absolute xl:top-0 xl:left-[-320px] xl:w-[320px] xl:max-w-[360px] xl:min-w-[320px]">
      <div className="rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
        <h2
          className="bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-base font-extrabold text-transparent sm:text-lg"
          suppressHydrationWarning
        >
          {mounted ? t('about.title') : 'About CodeVN'}
        </h2>
        {['about.greeting', 'about.p1', 'about.p2'].map((key, idx) => (
          <p
            key={key}
            className={`mt-${idx === 0 ? 2 : 3} text-sm text-gray-700`}
            suppressHydrationWarning
          >
            {mounted ? t(key) : ''}
          </p>
        ))}
        <div className="mt-4 flex w-full items-center gap-2">
          <Link
            href="/about"
            aria-label="About"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 transition hover:bg-gray-50"
          >
            <ExternalLink className="h-5 w-5 text-gray-700" />
          </Link>
          {siteConfig.links.github && (
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 transition hover:bg-gray-50"
            >
              <GitHubIcon className="h-5 w-5" />
            </a>
          )}
          {siteConfig.links.facebook && (
            <a
              href={siteConfig.links.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 transition hover:bg-gray-50"
            >
              <FacebookIcon className="h-5 w-5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
