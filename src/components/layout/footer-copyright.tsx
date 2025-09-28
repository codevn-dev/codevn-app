'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/components/providers';

interface FooterCopyrightProps {
  className?: string;
}

export function FooterCopyright({ className = 'text-sm text-gray-500' }: FooterCopyrightProps) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={className}>
      © {new Date().getFullYear()} CodeVN.{' '}
      <span suppressHydrationWarning>{mounted ? t('common.copyrightSuffix') : ''}</span>
    </div>
  );
}
