'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { User, Mail, Save } from 'lucide-react';
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

  const refreshProfileData = async () => {
    try {
      const response = await apiGet<{ user: UserProfile }>('/api/profile');
      const userData = response.user;

      // Update Zustand store with fresh user data
      updateUser({
        name: userData.name,
        email: userData.email,
        role: userData.role,
      });

      // Update local profile state
      const updatedProfileData = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role || 'user',
        avatar: userData.avatar,
        createdAt: userData.createdAt || new Date().toISOString(),
        statistics: userData.statistics,
      };
      setProfile(updatedProfileData);
      setOriginalProfile(updatedProfileData);

      return userData;
    } catch {
      // Error handled silently
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage('');

    try {
      await apiPut<UserProfile>('/api/profile', {
        name: profile.name,
      });

      // Refresh profile data from API
      await refreshProfileData();

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
          <Card className="rounded-2xl bg-white shadow-2xl shadow-gray-400/80">
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

                {message && (
                  <Card
                    className={`${
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
