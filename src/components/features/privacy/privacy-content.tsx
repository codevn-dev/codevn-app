'use client';
import { useI18n } from '@/components/providers';

export function PrivacyContent() {
  const { t } = useI18n();
  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Hero */}
      <div className="text-center">
        <h1 className="bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
          {t('privacy.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-gray-700 sm:text-lg">
          {t('privacy.title')}
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-gray mx-auto max-w-none text-gray-700">
        {/* Data Collection */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            {t('privacy.collection.title')}
          </h2>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('privacy.collection.p1')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('privacy.collection.p2')}</span>
            </li>
          </ul>
        </div>

        {/* Use of Data */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('privacy.use.title')}</h2>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('privacy.use.p1')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('privacy.use.p2')}</span>
            </li>
          </ul>
        </div>

        {/* Cookies and Tracking */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('privacy.cookies.title')}</h2>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('privacy.cookies.p1')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{t('privacy.cookies.p2')}</span>
            </li>
          </ul>
        </div>

        {/* Security */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            {t('privacy.security.title')}
          </h2>
          <p>{t('privacy.security.p1')}</p>
        </div>

        {/* Changes */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('privacy.changes.title')}</h2>
          <p>{t('privacy.changes.p1')}</p>
        </div>

        {/* Contact */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('privacy.contact.title')}</h2>
          <p>{t('privacy.contact.p1')}</p>
        </div>
      </div>
    </div>
  );
}
