'use client';

import { Trophy } from 'lucide-react';
import { Leaderboard } from '@/components/features/leaderboard';
import { useI18n } from '@/components/providers';
import { ClientOnly, MotionContainer } from '@/components/layout';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function LeaderboardPage() {
  const { t } = useI18n();
  return (
    <ClientOnly
      fallback={<LoadingScreen message="Loading leaderboard..." size="lg" variant="default" />}
    >
      <div className="py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <MotionContainer>
            <div className="rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-6 sm:mb-8">
                <div className="mb-4 flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-yellow-500" />
                  <h1
                    className="text-2xl font-bold text-gray-900 sm:text-3xl"
                    suppressHydrationWarning
                  >
                    {t('leaderboard.title')}
                  </h1>
                </div>
                <p className="mt-1 text-gray-700 sm:mt-2" suppressHydrationWarning>
                  {t('leaderboard.subtitle')}
                </p>
              </div>

              <Leaderboard variant="page" />
            </div>
          </MotionContainer>
        </div>
      </div>
    </ClientOnly>
  );
}
