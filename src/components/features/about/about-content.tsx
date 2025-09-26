'use client';
import { Sparkles, Bug, Users, ExternalLink } from 'lucide-react';
import GitHubIcon from '@/icons/github.svg';
import FacebookIcon from '@/icons/facebook.svg';
import { useI18n } from '@/components/providers';
import { siteConfig } from '@/config';

export function AboutContent() {
  const { t } = useI18n();
  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Hero */}
      <div className="text-center">
        <h1 className="bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
          {t('about.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-gray-700 sm:text-lg">
          {t('about.greeting')}
        </p>
      </div>

      {/* Lead paragraphs */}
      <div className="prose prose-gray mx-auto max-w-none text-gray-700">
        <p>{t('about.p1')}</p>
        <br />
        <p>{t('about.p2')}</p>
      </div>

      {/* Feature grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="bg-brand/10 text-brand group-hover:bg-brand/15 mb-3 inline-flex rounded-full p-2">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-gray-800">{t('about.list1')}</p>
        </div>
        <div className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="bg-brand/10 text-brand group-hover:bg-brand/15 mb-3 inline-flex rounded-full p-2">
            <Bug className="h-5 w-5" />
          </div>
          <p className="text-gray-800">{t('about.list2')}</p>
        </div>
        <div className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="bg-brand/10 text-brand group-hover:bg-brand/15 mb-3 inline-flex rounded-full p-2">
            <Users className="h-5 w-5" />
          </div>
          <p className="text-gray-800">{t('about.list3')}</p>
        </div>
      </div>

      {/* Philosophy text */}
      <div className="prose prose-gray mx-auto max-w-none text-gray-700">
        <p>{t('about.p3')}</p>
      </div>

      {/* Callout card */}
      <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-6 shadow-sm">
        <div className="prose prose-gray max-w-none text-gray-700">
          <p>{t('about.p4')}</p>
          <br />
          <p>{t('about.p5')}</p>
        </div>
        <div className="mt-5 flex w-full flex-wrap items-center justify-end gap-3">
          {siteConfig.links.github && (
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
            >
              <GitHubIcon className="h-4 w-4" />
              {t('home.github')}
              <ExternalLink className="h-4 w-4 text-gray-500" />
            </a>
          )}
          {siteConfig.links.facebook && (
            <a
              href={siteConfig.links.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
            >
              <FacebookIcon className="h-4 w-4" />
              {t('home.facebook')}
              <ExternalLink className="h-4 w-4 text-gray-500" />
            </a>
          )}
        </div>
      </div>

      {/* Final call-to-action paragraphs moved to the end */}
      <div className="prose prose-gray mx-auto max-w-none text-gray-700">
        <p>{t('about.p6')}</p>
        <br />
        <p>{t('about.p7')}</p>
        <br />
      </div>
    </div>
  );
}
