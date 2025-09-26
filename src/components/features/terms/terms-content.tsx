'use client';
import { useI18n } from '@/components/providers';

export function TermsContent() {
  const { t } = useI18n();
  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Hero */}
      <div className="text-center">
        <h1 className="bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
          {t('terms.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-gray-700 sm:text-lg">
          {t('terms.welcome')}
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-600">{t('terms.agreement')}</p>
      </div>

      {/* Content */}
      <div className="prose prose-gray mx-auto max-w-none text-gray-700">
        {/* Purpose */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('terms.purpose.title')}</h2>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('terms.purpose.p1')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('terms.purpose.p2')}</span>
            </li>
          </ul>
        </div>

        {/* User-Generated Content */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('terms.content.title')}</h2>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('terms.content.p1')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('terms.content.p2')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('terms.content.p3')}</span>
            </li>
          </ul>
        </div>

        {/* Privacy */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('terms.privacy.title')}</h2>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('terms.privacy.p1')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('terms.privacy.p2')}</span>
            </li>
          </ul>
        </div>

        {/* Responsibility */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            {t('terms.responsibility.title')}
          </h2>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('terms.responsibility.p1')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('terms.responsibility.p2')}</span>
            </li>
          </ul>
        </div>

        {/* Modifications */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            {t('terms.modifications.title')}
          </h2>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('terms.modifications.p1')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('terms.modifications.p2')}</span>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('terms.contact.title')}</h2>
          <p>{t('terms.contact.p1')}</p>
        </div>
      </div>
    </div>
  );
}
