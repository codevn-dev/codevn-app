'use client';

import { Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/providers';

interface SessionsHeaderProps {
  total: number;
  refreshing: boolean;
  onRefresh: (e?: React.MouseEvent) => void;
  canLogoutAll: boolean;
  onLogoutAll: () => void;
}

export function SessionsHeader({
  total,
  refreshing,
  onRefresh,
  canLogoutAll,
  onLogoutAll,
}: SessionsHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="mb-6 sm:mb-8">
      <div className="mb-4 flex items-center gap-3">
        <Shield className="h-8 w-8 text-blue-500" />
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t('sessions.title')}</h1>
      </div>
      <p className="mt-1 text-gray-700 sm:mt-2">{t('sessions.subtitle')}</p>

      <div className="mt-6 mb-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold sm:text-xl">
          {t('sessions.activeSessions')} ({total})
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {canLogoutAll && (
            <Button
              variant="back"
              size="sm"
              onClick={onLogoutAll}
              className="flex items-center gap-2 text-red-600 hover:bg-red-50"
            >
              {t('sessions.terminateOtherSessions')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
