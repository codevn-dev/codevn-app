'use client';

import { Trophy } from 'lucide-react';
import { Leaderboard } from '@/features/leaderboard';
import { useI18n } from '@/components/providers';

interface LeaderboardSidebarProps {
  mounted: boolean;
}

export function LeaderboardSidebar({ mounted }: LeaderboardSidebarProps) {
  const { t } = useI18n();

  return (
    <div className="hidden xl:absolute xl:top-0 xl:right-[-320px] xl:block xl:w-[320px] xl:max-w-[400px] xl:min-w-[320px] xl:flex-1">
      <div className="sticky top-6">
        <div className="rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <h2 className="text-lg font-bold text-gray-900 sm:text-xl" suppressHydrationWarning>
                {mounted ? t('leaderboard.title') : ''}
              </h2>
            </div>
          </div>
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}
