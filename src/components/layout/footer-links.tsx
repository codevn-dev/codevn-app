'use client';

import Link from 'next/link';
import { useI18n } from '@/components/providers';

interface FooterLinksProps {
  className?: string;
  showSeparators?: boolean;
}

export function FooterLinks({ className = '', showSeparators = false }: FooterLinksProps) {
  const { t } = useI18n();

  return (
    <div className={`flex items-center gap-4 text-sm ${className}`}>
      <Link href="/about" className="text-gray-500 transition-colors hover:text-gray-700">
        {t('nav.about')}
      </Link>
      {showSeparators && <span className="text-gray-300">•</span>}
      <Link href="/terms" className="text-gray-500 transition-colors hover:text-gray-700">
        {t('terms.title')}
      </Link>
      {showSeparators && <span className="text-gray-300">•</span>}
      <Link href="/privacy" className="text-gray-500 transition-colors hover:text-gray-700">
        {t('privacy.title')}
      </Link>
    </div>
  );
}
