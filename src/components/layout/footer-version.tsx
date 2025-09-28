'use client';

import { useI18n } from '@/components/providers';
import { siteConfig } from '@/config';

interface FooterVersionProps {
  className?: string;
}

export function FooterVersion({ className = 'text-xs text-gray-400' }: FooterVersionProps) {
  const { t } = useI18n();

  if (!siteConfig.version) {
    return null;
  }

  return (
    <div className={className}>
      {t('common.version')}: {siteConfig.version}
    </div>
  );
}
