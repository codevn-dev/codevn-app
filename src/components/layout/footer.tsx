'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/components/providers';
import { siteConfig } from '@/config';
import GitHubIcon from '@/icons/github.svg';
import FacebookIcon from '@/icons/facebook.svg';

export function AppFooter() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <footer className="border-t border-gray-100 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Mobile view - stacked layout */}
        <div className="flex flex-col items-center gap-3 sm:hidden">
          <Link
            href="/about"
            className="text-sm text-gray-500 transition-colors hover:text-gray-700"
          >
            {t('nav.about')}
          </Link>
          <Link
            href="/terms"
            className="text-sm text-gray-500 transition-colors hover:text-gray-700"
          >
            {t('terms.title')}
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-gray-500 transition-colors hover:text-gray-700"
          >
            {t('privacy.title')}
          </Link>

          {/* Social icons */}
          <div className="flex items-center gap-3">
            {siteConfig.links.github && (
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 transition hover:bg-gray-50"
              >
                <GitHubIcon className="h-4 w-4" />
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
                <FacebookIcon className="h-4 w-4" />
              </a>
            )}
          </div>

          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} CodeVN.{' '}
            <span suppressHydrationWarning>{mounted ? t('common.copyrightSuffix') : ''}</span>
          </div>
        </div>

        {/* Desktop view - side by side layout */}
        <div className="hidden items-center justify-between gap-4 sm:flex">
          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} CodeVN.{' '}
            <span suppressHydrationWarning>{mounted ? t('common.copyrightSuffix') : ''}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-sm">
              <Link href="/about" className="text-gray-500 transition-colors hover:text-gray-700">
                {t('nav.about')}
              </Link>
              <span className="text-gray-300">•</span>
              <Link href="/terms" className="text-gray-500 transition-colors hover:text-gray-700">
                {t('terms.title')}
              </Link>
              <span className="text-gray-300">•</span>
              <Link href="/privacy" className="text-gray-500 transition-colors hover:text-gray-700">
                {t('privacy.title')}
              </Link>
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-2">
              {siteConfig.links.github && (
                <a
                  href={siteConfig.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 transition hover:bg-gray-50"
                >
                  <GitHubIcon className="h-4 w-4" />
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
                  <FacebookIcon className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
