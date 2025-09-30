'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {} from 'framer-motion';
import {} from 'lucide-react';
import {} from '@/components/ui/button';
import {} from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { MotionContainer, ClientOnly } from '@/components/layout';
import { useAuthState } from '@/hooks/use-auth-state';
import { apiGet, apiPost } from '@/lib/utils/api-client';
import { useI18n } from '@/components/providers';
import type { SessionInterface } from '@/types/shared';
import {
  SessionsHeader,
  SessionsControls,
  SessionsList,
  SessionDetailsModal,
  ConfirmModal,
} from '@/features/sessions';

function SessionsPageContent() {
  const { locale } = useI18n();
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
      // Using apiGet to fetch sessions data
      // Can add parallel API calls here in the future if needed
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
            <SessionsHeader
              total={sessions.length}
              refreshing={refreshing}
              onRefresh={(e) => refreshSessions(e)}
              canLogoutAll={sessions.length > 1}
              onLogoutAll={() => setShowLogoutAll(true)}
            />

            <SessionsControls viewMode={viewMode} onChange={(mode) => setViewMode(mode)} />

            <SessionsList
              filteredSessions={filteredSessions}
              locale={locale}
              onSelect={(session) => {
                setSelectedSession(session);
                setShowDetails(true);
              }}
              onTerminate={(token) => handleTerminateSession(token)}
              logoutLoading={logoutLoading}
            />

            <SessionDetailsModal
              open={showDetails}
              session={selectedSession}
              locale={locale as any}
              onClose={() => setShowDetails(false)}
              onTerminate={(token) => handleTerminateSession(token)}
              logoutLoading={logoutLoading}
            />

            <ConfirmModal
              open={showLogoutOther}
              titleKey="sessions.terminateSession"
              descriptionKey="sessions.terminateSessionDescription"
              confirmKey="sessions.terminateSessionButton"
              onClose={() => {
                setShowLogoutOther(false);
                setSessionToLogout(null);
              }}
              onConfirm={confirmLogoutOther}
              loading={logoutLoading === sessionToLogout}
            />

            <ConfirmModal
              open={showLogoutAll}
              titleKey="sessions.terminateOtherSessionsTitle"
              descriptionKey="sessions.terminateOtherSessionsDescription"
              confirmKey="sessions.terminateOtherSessionsButton"
              onClose={() => setShowLogoutAll(false)}
              onConfirm={logoutAllSessions}
              loading={logoutLoading === 'all'}
            />
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
