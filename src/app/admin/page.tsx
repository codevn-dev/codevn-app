'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Users, Tag } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { ClientOnly, MotionContainer } from '@/components/layout';
import { RoleLevel } from '@/types/shared/roles';
import { useI18n } from '@/components/providers';
import { UsersManagement, SystemUsers, Categories } from '@/components/features/admin';
import { formatNumberShort } from '@/lib/utils';

function AdminPageContent() {
  const { t } = useI18n();
  const { user, isAuthenticated, isLoading } = useAuthState();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'categories' | 'users' | 'system-users'>('users');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);

  // Handle initial load to prevent scroll jump
  useEffect(() => {
    if (isInitialLoad) {
      // Disable browser scroll restoration
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }

      // Prevent any scrolling during initial load
      document.body.style.overflow = 'hidden';

      // Force scroll to top
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

      // Re-enable after 1 second
      setTimeout(() => {
        setIsInitialLoad(false);
        document.body.style.overflow = 'auto';
      }, 1000);
    }
  }, [isInitialLoad]);

  useEffect(() => {
    // Wait for auth state to be determined
    if (isLoading) {
      return;
    }

    // If not authenticated, redirect to home
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    // If authenticated, check role
    if (user) {
      if (user.role !== RoleLevel.admin) {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [user, isAuthenticated, isLoading, router]);

  // Show loading while auth state is being determined
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user || user.role !== RoleLevel.admin) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-gray-600">{t('admin.accessDenied')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <MotionContainer>
          <div className="shadow-brand/30 rounded-2xl bg-white p-6 shadow-2xl drop-shadow-2xl">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t('admin.panel')}</h1>
            </div>

            {/* Simple Tab Navigation */}
            <div className="mb-6 sm:mb-8">
              <div className="shadow-brand/30 rounded-xl bg-white/80 p-4 shadow-2xl drop-shadow-2xl backdrop-blur-sm">
                <nav className="no-scrollbar -mb-px flex space-x-6 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`border-b-2 px-1 py-2 text-sm font-medium ${
                      activeTab === 'users'
                        ? 'border-brand text-brand'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                    tabIndex={isInitialLoad ? -1 : 0}
                  >
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      {t('common.role.member')} ({formatNumberShort(totalUsers)})
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('system-users')}
                    className={`border-b-2 px-1 py-2 text-sm font-medium ${
                      activeTab === 'system-users'
                        ? 'border-brand text-brand'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                    tabIndex={isInitialLoad ? -1 : 0}
                  >
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      {t('admin.systemUsers')}
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('categories')}
                    className={`border-b-2 px-1 py-2 text-sm font-medium ${
                      activeTab === 'categories'
                        ? 'border-brand text-brand'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                    tabIndex={isInitialLoad ? -1 : 0}
                  >
                    <div className="flex items-center">
                      <Tag className="mr-2 h-4 w-4" />
                      {t('admin.categories')}
                    </div>
                  </button>
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'users' && (
              <UsersManagement onDataChange={(total) => setTotalUsers(total)} />
            )}
            {activeTab === 'system-users' && <SystemUsers />}
            {activeTab === 'categories' && <Categories />}
          </div>
        </MotionContainer>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ClientOnly
      fallback={<LoadingScreen message="Loading admin panel..." size="lg" variant="default" />}
    >
      <AdminPageContent />
    </ClientOnly>
  );
}
