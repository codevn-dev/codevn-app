'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { User, Mail, Calendar, Shield, Save } from 'lucide-react';
import { useFastifyAuthStore } from '@/stores';
import { useAuthState } from '@/hooks/use-auth-state';
import { ClientOnly } from '@/components/layout';
import { AvatarUpload } from '@/features/upload';
import { formatDate } from '@/lib/utils';

import { User as UserProfile } from '@/types/shared/auth';

function ProfilePageContent() {
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

    // If authenticated, set up profile
    if (user) {
      const profileData = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt,
      };
      setProfile(profileData);
      setOriginalProfile(profileData);
      setLoading(false);
    }
  }, [isAuthenticated, user, isLoading, router]);

  // Check if profile has changes (excluding avatar)
  const hasChanges = () => {
    if (!profile || !originalProfile) return false;

    return profile.name !== originalProfile.name || profile.email !== originalProfile.email;
  };

  const refreshProfileData = async () => {
    try {
      const { apiGet } = await import('@/lib/utils/api-client');
      const userData = await apiGet('/api/profile');

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
        role: userData.role,
        avatar: userData.avatar,
        createdAt: userData.createdAt || new Date().toISOString(),
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
      const { apiPut } = await import('@/lib/utils/api-client');
      await apiPut('/api/profile', {
        name: profile.name,
        email: profile.email,
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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Card className="shadow-lg">
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
              <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
              <p className="mt-2 text-gray-600">Manage your account information and preferences</p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={profile.name || ''}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={profile.email || ''}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card className="border-blue-200 bg-blue-50">
                <CardBody className="flex flex-row items-center p-4">
                  <Shield className="mr-3 h-5 w-5 text-blue-500" />
                  <div>
                    <Badge className="mb-1">
                      {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                    </Badge>
                    <p className="text-sm text-blue-700">Your current access level</p>
                  </div>
                </CardBody>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardBody className="flex flex-row items-center p-4">
                  <Calendar className="mr-3 h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-semibold text-green-800">{formatDate(profile.createdAt)}</p>
                    <p className="text-sm text-green-700">Account creation date</p>
                  </div>
                </CardBody>
              </Card>
            </div>

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

            <div className="flex justify-end border-t border-gray-200 pt-6">
              <Button type="submit" disabled={saving || !hasChanges()} size="lg">
                {saving ? (
                  <LoadingScreen message="Saving" />
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
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
