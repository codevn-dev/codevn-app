'use client';

import { useI18n } from '@/components/providers';
import { Switch } from '@/components/ui/switch';

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const isEnglish = locale === 'en';

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
