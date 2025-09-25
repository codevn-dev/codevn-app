'use client';

import { Trophy } from 'lucide-react';
import { Leaderboard } from '@/components/features/leaderboard';
import { useI18n } from '@/components/providers';

export default function LeaderboardPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl" suppressHydrationWarning>
                {t('leaderboard.title')}
              </h1>
            </div>
            <p className="mt-2 text-lg text-gray-600" suppressHydrationWarning>
              {t('leaderboard.subtitle')}
            </p>
          </div>

          <Leaderboard variant="page" />
        </div>
      </div>
    </div>
  );
}
