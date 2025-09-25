'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { User, Mail, Save, Monitor, Smartphone, Tablet, Globe, Clock } from 'lucide-react';
import { useFastifyAuthStore } from '@/stores';
import { useAuthState } from '@/hooks/use-auth-state';
import { ClientOnly, MotionContainer } from '@/components/layout';
import { AvatarUpload } from '@/features/upload';
import { ProfileInfoStats } from '@/features/profile/profile-info-stats';
import { formatDate } from '@/lib/utils';
import { apiGet, apiPut } from '@/lib/utils/api-client';
import { useI18n } from '@/components/providers';

import { User as UserProfile } from '@/types/shared/auth';

function ProfilePageContent() {
  const { t } = useI18n();
  const { user, isAuthenticated, isLoading } = useAuthState();
  const { updateUser } = useFastifyAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    // Wait for auth state to be determined
    if (isLoading) return;

    // If not authenticated, redirect to home
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    // If authenticated, fetch profile data with statistics
    if (user) {
      const fetchProfileWithStats = async () => {
        try {
          setLoading(true);
          // Fetch fresh profile data with statistics from API
          const response = await apiGet<{ user: UserProfile }>('/api/profile');
          const userData = response.user;

          const profileData = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            avatar: userData.avatar,
            role: userData.role || 'user',
            createdAt: userData.createdAt,
            statistics: userData.statistics,
          };
          setProfile(profileData);
          setOriginalProfile(profileData);
          setActiveSessions([]);
        } catch {
          // Fallback to user data from auth state if API fails
          const profileData = {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            role: user.role || 'user',
            createdAt: user.createdAt,
          };
          setProfile(profileData);
          setOriginalProfile(profileData);
        } finally {
          setLoading(false);
        }
      };

      fetchProfileWithStats();
    }
  }, [isAuthenticated, user, isLoading, router]);

  // Check if profile has changes (excluding avatar and email)
  const hasChanges = () => {
    if (!profile || !originalProfile) return false;

    return profile.name !== originalProfile.name;
  };

  const refreshActiveSessions = async () => {
    try {
      setSessionsLoading(true);
      await apiGet<{ user: UserProfile }>('/api/profile');
      setActiveSessions([]);
    } catch (error) {
      console.error('Failed to refresh active sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'Mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'Tablet':
        return <Tablet className="h-4 w-4" />;
      case 'Desktop':
      default:
        return <Monitor className="h-4 w-4" />;
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage('');

    try {
      const response = await apiPut<{ user: UserProfile }>('/api/profile', {
        name: profile.name,
      });

      // Update local state with response data (no need for additional API call)
      const updatedUser = response.user;
      updateUser({
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      });

      const updatedProfileData = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role || 'user',
        avatar: updatedUser.avatar,
        createdAt: updatedUser.createdAt || new Date().toISOString(),
        statistics: updatedUser.statistics,
      };
      setProfile(updatedProfileData);
      setOriginalProfile(updatedProfileData);

      setMessage('Profile updated successfully');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  // Show loading while auth state is being determined
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!profile) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <MotionContainer>
          <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center">
                <AvatarUpload
                  size="lg"
                  onAvatarChange={(avatar) => {
                    setProfile((prev) => (prev ? { ...prev, avatar: avatar || undefined } : null));
                    // Update original profile to prevent save button from being enabled
                    setOriginalProfile((prev) =>
                      prev ? { ...prev, avatar: avatar || undefined } : null
                    );
                  }}
                />
                <div className="ml-6">
                  <h1 className="text-3xl font-bold text-gray-900">{t('profile.settings')}</h1>
                  <p className="mt-2 text-gray-600">{t('profile.manageIntro')}</p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-gray-700">
                      {t('common.fullName')}
                    </label>
                    <div className="relative">
                      <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                      <Input
                        id="name"
                        placeholder={t('common.fullNamePlaceholder')}
                        value={profile.name || ''}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-gray-700">
                      {t('profile.emailAddress')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={profile.email || ''}
                        className="cursor-not-allowed bg-gray-50 pl-10"
                        disabled
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <ProfileInfoStats
                  roleLabel={t('profile.accessLevel')}
                  createdAtLabel={t('profile.memberSince')}
                  role={profile.role === 'admin' ? t('common.role.admin') : t('common.role.user')}
                  createdAtFormatted={formatDate(profile.createdAt)}
                  statistics={profile.statistics}
                />

                {/* Active Sessions Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Active Sessions</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={refreshActiveSessions}
                      disabled={sessionsLoading}
                    >
                      {sessionsLoading ? 'Loading...' : 'Refresh'}
                    </Button>
                  </div>

                  {sessionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingScreen message="Loading sessions..." size="sm" />
                    </div>
                  ) : activeSessions.length > 0 ? (
                    <div className="space-y-3">
                      {activeSessions.map((session, index) => (
                        <Card
                          key={index}
                          className={`${session.isCurrent ? 'ring-2 ring-blue-500' : ''}`}
                        >
                          <CardBody className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {getDeviceIcon(session.deviceInfo?.device || 'Desktop')}
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-900">
                                      {session.deviceInfo?.browser || 'Unknown Browser'} on{' '}
                                      {session.deviceInfo?.os || 'Unknown OS'}
                                    </span>
                                    {session.isCurrent && (
                                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                                        Current
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                                    <div className="flex items-center space-x-1">
                                      <Globe className="h-3 w-3" />
                                      <span>{session.countryCode || 'Unknown'}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-3 w-3" />
                                      <span>
                                        Last active:{' '}
                                        {formatRelativeTime(
                                          session.lastActive || session.loginTime
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right text-xs text-gray-400">
                                <div>Login: {formatRelativeTime(session.loginTime)}</div>
                                <div className="font-mono">{session.token}</div>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardBody className="p-6 text-center">
                        <Monitor className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                          No active sessions
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">No active sessions found.</p>
                      </CardBody>
                    </Card>
                  )}
                </div>

                {message && (
                  <Card
                    className={`border ${
                      message.includes('successfully')
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <CardBody className="flex flex-row items-center p-4">
                      <div
                        className={`mr-3 h-3 w-3 rounded-full ${
                          message.includes('successfully') ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      ></div>
                      <span className="font-semibold">{message}</span>
                    </CardBody>
                  </Card>
                )}

                <div className="flex justify-end pt-6">
                  <Button type="submit" disabled={saving || !hasChanges()} size="lg">
                    {saving ? (
                      <LoadingScreen message={t('common.saving')} />
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {t('common.save')}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </MotionContainer>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ClientOnly
      fallback={<LoadingScreen message="Loading profile..." size="lg" variant="default" />}
    >
      <ProfilePageContent />
    </ClientOnly>
  );
}
