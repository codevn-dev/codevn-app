'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useI18n } from '@/components/providers';

interface ArticlesHeaderProps {
  totalItems: number;
  onCreate: () => void;
}

export function ArticlesHeader({ totalItems, onCreate }: ArticlesHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="mb-6 sm:mb-8">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t('articles.my')}</h1>
      <p className="mt-1 text-gray-700 sm:mt-2">{t('articles.manageIntro')}</p>

      <div className="mt-6 mb-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold sm:text-xl">
          {t('articles.total')} ({totalItems})
        </h2>
        <Button className="w-full sm:w-auto" onClick={onCreate}>
          <Plus className="mr-1 h-4 w-4" />
          {t('articles.new')}
        </Button>
      </div>
    </div>
  );
}
