'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  X,
  AlertTriangle,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { MotionContainer, ClientOnly } from '@/components/layout';
import { useAuthState } from '@/hooks/use-auth-state';
import { apiGet, apiPost } from '@/lib/utils/api-client';
import { useI18n } from '@/components/providers';
import type { SessionInterface } from '@/types/shared';

function SessionsPageContent() {
  const { t, locale } = useI18n();
  const { isAuthenticated, isLoading } = useAuthState();
  const router = useRouter();

  const [sessions, setSessions] = useState<SessionInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionInterface | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showLogoutAll, setShowLogoutAll] = useState(false);
  const [showLogoutOther, setShowLogoutOther] = useState(false);
  const [sessionToLogout, setSessionToLogout] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'current' | 'other'>('all');

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    fetchSessions();
  }, [isAuthenticated, isLoading, router]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await apiGet<{ success: boolean; sessions: any[] }>('/api/session');
      const sessions = response.sessions || [];

      // Map sessions to match our interface
      const mappedSessions: SessionInterface[] = sessions.map((session: SessionInterface) => ({
        token: session.token,
        countryCode: session.country?.code,
        country: session.country,
        deviceInfo: session.deviceInfo
          ? {
              device: session.deviceInfo.device,
              browser: session.deviceInfo.browser,
              os: session.deviceInfo.os,
            }
          : undefined,
        loginTime: session.loginTime,
        lastActive: session.lastActive || session.loginTime,
        isCurrent: session.isCurrent || false,
      }));

      setSessions(mappedSessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSessions = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    try {
      setRefreshing(true);
      await fetchSessions();
    } finally {
      setRefreshing(false);
    }
  };

  const handleTerminateSession = (sessionToken: string) => {
    setSessionToLogout(sessionToken);
    setShowLogoutOther(true);
  };

  const terminateSession = async (sessionToken: string) => {
    try {
      setLogoutLoading(sessionToken);

      // Send token in array
      await apiPost('/api/session/terminate', { tokens: [sessionToken] });

      // Just refresh sessions (current session can't be terminated)
      await fetchSessions();
    } catch (error) {
      console.error('Failed to logout session:', error);
    } finally {
      setLogoutLoading(null);
    }
  };

  const confirmLogoutOther = async () => {
    if (sessionToLogout) {
      setShowLogoutOther(false);
      await terminateSession(sessionToLogout);
      setSessionToLogout(null);
    }
  };

  // Filter sessions based on view mode
  const filteredSessions = sessions.filter((session) => {
    switch (viewMode) {
      case 'current':
        return session.isCurrent;
      case 'other':
        return !session.isCurrent;
      default:
        return true;
    }
  });

  const logoutAllSessions = async () => {
    try {
      setLogoutLoading('all');

      // Get all tokens except current session
      const otherTokens = sessions
        .filter((session) => !session.isCurrent)
        .map((session) => session.token);

      if (otherTokens.length > 0) {
        await apiPost('/api/session/terminate', { tokens: otherTokens });
      }

      setShowLogoutAll(false);
      await fetchSessions();
    } catch (error) {
      console.error('Failed to logout all sessions:', error);
    } finally {
      setLogoutLoading(null);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'Mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'Tablet':
        return <Tablet className="h-5 w-5" />;
      case 'Desktop':
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingScreen message="Loading sessions..." size="lg" />
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <MotionContainer>
          <div className="rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 sm:mb-8">
              <div className="mb-4 flex items-center gap-3">
                <Shield className="h-8 w-8 text-blue-500" />
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                  {t('sessions.title')}
                </h1>
              </div>
              <p className="mt-1 text-gray-700 sm:mt-2">{t('sessions.subtitle')}</p>
            </div>

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold sm:text-xl">
                {t('sessions.activeSessions')} ({sessions.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={(e) => refreshSessions(e)}
                  disabled={refreshing}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                {sessions.length > 1 && (
                  <Button
                    variant="back"
                    size="sm"
                    onClick={() => setShowLogoutAll(true)}
                    className="flex items-center gap-2 text-red-600 hover:bg-red-50"
                  >
                    {t('sessions.terminateOtherSessions')}
                  </Button>
                )}
              </div>
            </div>

            {/* Sticky View Mode Controls */}
            <div className="sticky top-16 z-40 mb-6 rounded-xl bg-white/80 p-4 shadow-xl shadow-gray-300/60 backdrop-blur-sm">
              <div className="flex gap-1 sm:gap-2">
                {[
                  { key: 'all', label: t('sessions.allSessions') },
                  { key: 'current', label: t('sessions.current') },
                  { key: 'other', label: t('sessions.otherDevices') },
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={viewMode === key ? 'default' : 'back'}
                    onClick={() => setViewMode(key as 'all' | 'current' | 'other')}
                    className={`flex-1 px-2 py-1.5 text-xs transition-all sm:flex-none sm:px-3 ${
                      viewMode === key ? 'bg-brand text-white shadow-md' : 'hover:bg-gray-100'
                    }`}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sessions List */}
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
                      onClick={() => {
                        setSelectedSession(session);
                        setShowDetails(true);
                      }}
                      className={`flex min-h-[72px] cursor-pointer items-center gap-3 rounded-xl p-3 ${
                        session.isCurrent
                          ? 'border border-blue-200 bg-gradient-to-r from-blue-50 to-white'
                          : 'hover:bg-brand/10'
                      }`}
                    >
                      {/* Device Icon */}
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                        {session.deviceInfo ? (
                          getDeviceIcon(session.deviceInfo?.device || t('sessions.unknownDevice'))
                        ) : (
                          <Monitor className="h-5 w-5" />
                        )}
                      </div>

                      {/* Session Info */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-gray-900">
                            {session.deviceInfo?.device || t('sessions.unknownDevice')}
                          </h3>
                          {session.isCurrent && (
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-xs text-blue-800"
                            >
                              {t('sessions.currentBadge')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {session.country?.name[locale] || t('sessions.unknown')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(session.lastActive || session.loginTime)}
                          </span>
                          {session.deviceInfo?.browser && <span>{session.deviceInfo.browser}</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!session.isCurrent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTerminateSession(session.token);
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

            {/* Session Details Modal */}
            {showDetails && selectedSession && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm sm:px-0"
                onClick={() => setShowDetails(false)}
              >
                <div
                  className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl shadow-gray-300/60"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {t('sessions.sessionDetails')}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {t('sessions.sessionDetailsDescription')}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {t('sessions.deviceInformation')}
                      </h4>
                      <div className="mt-2 space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          {selectedSession.deviceInfo ? (
                            getDeviceIcon(selectedSession.deviceInfo?.device || 'Desktop')
                          ) : (
                            <Monitor className="h-4 w-4" />
                          )}
                          <span>
                            {selectedSession.deviceInfo?.device || t('sessions.unknownDevice')}
                          </span>
                        </div>
                        {selectedSession.deviceInfo?.browser && (
                          <div>Browser: {selectedSession.deviceInfo.browser}</div>
                        )}
                        {selectedSession.deviceInfo?.os && (
                          <div>OS: {selectedSession.deviceInfo.os}</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900">{t('sessions.locationTime')}</h4>
                      <div className="mt-2 space-y-2 text-sm text-gray-600">
                        <div>
                          {t('sessions.country')}:{' '}
                          {selectedSession.country?.name[locale] || t('sessions.unknown')}
                        </div>
                        <div>
                          {t('sessions.loginTime')}:{' '}
                          {new Date(selectedSession.loginTime).toLocaleString()}
                        </div>
                        <div>
                          {t('sessions.lastActive')}:{' '}
                          {formatRelativeTime(
                            selectedSession.lastActive || selectedSession.loginTime
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-2">
                    <Button variant="back" onClick={() => setShowDetails(false)}>
                      {t('common.close')}
                    </Button>
                    {!selectedSession.isCurrent && (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setShowDetails(false);
                          handleTerminateSession(selectedSession.token);
                        }}
                        disabled={logoutLoading === selectedSession.token}
                        className="text-red-600 hover:bg-red-50"
                      >
                        {logoutLoading === selectedSession.token ? (
                          <LoadingScreen size="sm" />
                        ) : (
                          <>
                            <X className="mr-1 h-4 w-4" />
                            {t('sessions.terminate')}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Terminate Session Confirmation Modal */}
            {showLogoutOther && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm sm:px-0"
                onClick={() => {
                  setShowLogoutOther(false);
                  setSessionToLogout(null);
                }}
              >
                <div
                  className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl shadow-gray-300/60"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-4">
                    <h2 className="flex items-center space-x-2 text-lg font-semibold">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span>{t('sessions.terminateSession')}</span>
                    </h2>
                    <p className="text-sm text-gray-600">
                      {t('sessions.terminateSessionDescription')}
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      variant="back"
                      className="border-gray-300"
                      onClick={() => {
                        setShowLogoutOther(false);
                        setSessionToLogout(null);
                      }}
                      disabled={logoutLoading === sessionToLogout}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      variant="back"
                      className="border-red-500 text-red-600 hover:bg-red-50"
                      onClick={confirmLogoutOther}
                      disabled={logoutLoading === sessionToLogout}
                    >
                      {logoutLoading === sessionToLogout ? (
                        <LoadingScreen size="sm" />
                      ) : (
                        t('sessions.terminateSessionButton')
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Terminate Other Sessions Confirmation Modal */}
            {showLogoutAll && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm sm:px-0"
                onClick={() => setShowLogoutAll(false)}
              >
                <div
                  className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl shadow-gray-300/60"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-4">
                    <h2 className="flex items-center space-x-2 text-lg font-semibold">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span>{t('sessions.terminateOtherSessionsTitle')}</span>
                    </h2>
                    <p className="text-sm text-gray-600">
                      {t('sessions.terminateOtherSessionsDescription')}
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      variant="back"
                      className="border-gray-300"
                      onClick={() => setShowLogoutAll(false)}
                      disabled={logoutLoading === 'all'}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      variant="back"
                      className="border-red-500 text-red-600 hover:bg-red-50"
                      onClick={logoutAllSessions}
                      disabled={logoutLoading === 'all'}
                    >
                      {logoutLoading === 'all' ? (
                        <LoadingScreen size="sm" />
                      ) : (
                        t('sessions.terminateOtherSessionsButton')
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </MotionContainer>
      </div>
    </div>
  );
}

export default function SessionsPage() {
  return (
    <ClientOnly
      fallback={
        <LoadingScreen message="Loading session management..." size="lg" variant="default" />
      }
    >
      <SessionsPageContent />
    </ClientOnly>
  );
}
