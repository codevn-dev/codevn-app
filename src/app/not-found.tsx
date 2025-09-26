'use client';

import Link from 'next/link';
import { useI18n } from '@/components/providers';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="mb-3 text-3xl font-bold text-gray-900 sm:text-4xl">{t('notFound.title')}</h1>
      <p className="mb-8 max-w-xl text-base text-gray-700 sm:text-lg">
        {t('notFound.description')}
      </p>
      <Link
        href="/"
        className="bg-brand hover:bg-brand-600 inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors"
      >
        {t('notFound.backHome')}
      </Link>
    </div>
  );
}
