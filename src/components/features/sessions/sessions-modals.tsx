'use client';

import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useI18n } from '@/components/providers';
import { AlertTriangle, Clock, Earth, Globe, LogIn, Monitor } from 'lucide-react';
import type { SessionInterface } from '@/types/shared';
import { getDeviceIcon, getOSIcon, formatRelativeTime } from './sessions-utils';

interface SessionDetailsModalProps {
  open: boolean;
  session: SessionInterface | null;
  locale: 'vi' | 'en';
  onClose: () => void;
  onTerminate: (token: string) => void;
  logoutLoading: string | null;
}

export function SessionDetailsModal({
  open,
  session,
  locale,
  onClose,
  onTerminate,
  logoutLoading,
}: SessionDetailsModalProps) {
  const { t } = useI18n();
  if (!open || !session) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm sm:px-0"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl shadow-gray-300/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('sessions.sessionDetails')}</h2>
          <p className="text-sm text-gray-600">{t('sessions.sessionDetailsDescription')}</p>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900">{t('sessions.deviceInformation')}</h4>
            <div className="mt-2 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                {session.deviceInfo ? (
                  getDeviceIcon(session.deviceInfo?.device || 'Desktop')
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
                <span>{session.deviceInfo?.device || t('sessions.unknownDevice')}</span>
              </div>
              {session.deviceInfo?.browser && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>Browser: {session.deviceInfo.browser}</span>
                </div>
              )}
              {session.deviceInfo?.os && (
                <div className="flex items-center gap-2">
                  {getOSIcon(session.deviceInfo.os)}
                  <span>OS: {session.deviceInfo.os}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900">{t('sessions.locationTime')}</h4>
            <div className="mt-2 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Earth className="h-4 w-4" />
                <span>
                  {t('sessions.country')}: {session.country?.name[locale] || t('sessions.unknown')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                <span>
                  {t('sessions.loginTime')}: {formatRelativeTime(session.loginTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  {t('sessions.lastActive')}:{' '}
                  {formatRelativeTime(session.lastActive || session.loginTime)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="back" onClick={onClose}>
            {t('common.close')}
          </Button>
          {!session.isCurrent && (
            <Button
              variant="destructive"
              onClick={() => {
                onClose();
                onTerminate(session.token);
              }}
              disabled={logoutLoading === session.token}
              className="text-red-600 hover:bg-red-50"
            >
              {logoutLoading === session.token ? (
                <LoadingScreen size="sm" />
              ) : (
                <>✖ {t('sessions.terminate')}</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  titleKey: string;
  descriptionKey: string;
  confirmKey: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmModal({
  open,
  titleKey,
  descriptionKey,
  confirmKey,
  onClose,
  onConfirm,
  loading,
}: ConfirmModalProps) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm sm:px-0"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl shadow-gray-300/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="flex items-center space-x-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>{t(titleKey)}</span>
          </h2>
          <p className="text-sm text-gray-600">{t(descriptionKey)}</p>
        </div>
        <div className="flex justify-end space-x-3">
          <Button variant="back" className="border-gray-300" onClick={onClose} disabled={!!loading}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="back"
            className="border-red-500 text-red-600 hover:bg-red-50"
            onClick={onConfirm}
            disabled={!!loading}
          >
            {loading ? <LoadingScreen size="sm" /> : t(confirmKey)}
          </Button>
        </div>
      </div>
    </div>
  );
}
