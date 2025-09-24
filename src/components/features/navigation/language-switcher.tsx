'use client';

import { useI18n } from '@/components/providers';
import { Switch } from '@/components/ui/switch';
import { useClientOnly } from '@/hooks/use-client-only';

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const isClient = useClientOnly();
  const isEnglish = locale === 'en';

  // Don't render on server to avoid hydration mismatch
  if (!isClient) {
    return <div className="h-6 w-12 animate-pulse rounded-full bg-gray-200" />;
  }

  return (
    <Switch
      checked={isEnglish}
      onCheckedChange={(checked) => setLocale(checked ? 'en' : 'vi')}
      size="sm"
      labels={{ on: 'EN', off: 'VI' }}
      variant="toggle"
      aria-label={isEnglish ? 'Switch to Vietnamese' : 'Chuyển sang English'}
    />
  );
}
