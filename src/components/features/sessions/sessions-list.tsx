'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useI18n } from '@/components/providers';
import { Monitor, Earth, Globe, Clock, X, Shield } from 'lucide-react';
import type { SessionInterface } from '@/types/shared';
import { getDeviceIcon, formatRelativeTime } from './sessions-utils';

interface SessionsListProps {
  filteredSessions: SessionInterface[];
  locale: 'vi' | 'en';
  onSelect: (session: SessionInterface) => void;
  onTerminate: (token: string) => void;
  logoutLoading: string | null;
}

export function SessionsList({
  filteredSessions,
  locale,
  onSelect,
  onTerminate,
  logoutLoading,
}: SessionsListProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {filteredSessions.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="py-8 text-center"
          >
            <Shield className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">{t('sessions.noSessionsFound')}</p>
          </motion.div>
        ) : (
          filteredSessions.map((session, index) => (
            <motion.div
              key={`session-${index}-${session.token.substring(0, 10)}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              onClick={() => onSelect(session)}
              className={`flex min-h-[72px] cursor-pointer items-center gap-3 rounded-xl p-3 ${
                session.isCurrent
                  ? 'border border-blue-200 bg-gradient-to-r from-blue-50 to-white'
                  : 'hover:bg-brand/10'
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                {session.deviceInfo ? (
                  getDeviceIcon(session.deviceInfo?.device)
                ) : (
                  <Monitor className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-gray-900">
                    {session.deviceInfo?.device || t('sessions.unknownDevice')}
                  </h3>
                  {session.isCurrent && (
                    <Badge variant="secondary" className="bg-blue-100 text-xs text-blue-800">
                      {t('sessions.currentBadge')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Earth className="h-3 w-3" />
                    {session.country?.name[locale] || t('sessions.unknown')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(session.lastActive || session.loginTime)}
                  </span>
                  {session.deviceInfo?.browser && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {session.deviceInfo.browser}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTerminate(session.token);
                    }}
                    disabled={logoutLoading === session.token}
                    className="text-red-600 hover:bg-red-50"
                  >
                    {logoutLoading === session.token ? (
                      <LoadingScreen size="sm" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
}
