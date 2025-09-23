'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/components/providers';

export function AppFooter() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-500">
      © {new Date().getFullYear()} CodeVN.{' '}
      <span suppressHydrationWarning>{mounted ? t('common.copyrightSuffix') : ''}</span>
    </footer>
  );
}
