'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AuthModal } from '@/features/auth';
import { User, Settings, LogOut, FileText, Menu as MenuIcon, X as CloseIcon } from 'lucide-react';
import { useFastifyAuthStore, useUIStore } from '@/stores';
import { useAuthState } from '@/hooks/use-auth-state';
import { useAuthActions } from '@/hooks/use-auth-actions';
import { useState } from 'react';
import Image from 'next/image';
import { isAdmin } from '@/lib/utils';
import { LanguageSwitcher } from './language-switcher';
import { useI18n } from '@/components/providers';

export function Navigation() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthState();
  const { signOut } = useFastifyAuthStore();
  const { signOut: authSignOut } = useAuthActions();
  const { setAuthModalOpen, setAuthMode } = useUIStore();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();

  const handleSignOut = async () => {
    try {
      // Use auth actions logout
      await authSignOut();
      // Clear local state
      signOut();
      // Stay on current page, optionally refresh data if needed
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state and stay on page
      signOut();
      router.refresh();
    }
  };

  const handleHomeClick = () => {
    if (typeof window === 'undefined') return;
    if (pathname !== '/') {
      router.push('/');
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <nav className="fixed top-0 right-0 left-0 z-50 transform-gpu bg-white/80 shadow-lg backdrop-blur-md [will-change:transform] [backface-visibility:hidden]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <button
              onClick={handleHomeClick}
              className="flex items-center space-x-3 transition-opacity hover:opacity-80"
            >
              <Image
                src="/logo.svg"
                alt="CodeVN Logo"
                width={40}
                height={40}
                className="h-10 w-10"
                priority
              />
              <span className="from-brand to-brand-600 bg-gradient-to-r bg-clip-text text-[22px] leading-tight font-semibold tracking-tight text-transparent sm:text-2xl">
                CodeVN
              </span>
            </button>

            {/* Navigation Items - Desktop */}
            <div className="hidden items-center space-x-4 md:flex">
              {isAuthLoading ? null : isAuthenticated && user ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-brand text-brand hover:bg-brand/10 shadow-brand/20 hover:shadow-brand/30 cursor-pointer shadow-md transition-shadow hover:shadow-lg"
                    onClick={() => router.push('/articles')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {t('nav.articles')}
                  </Button>

                  {isAdmin(user.role) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-brand text-brand hover:bg-brand/10 shadow-brand/20 hover:shadow-brand/30 cursor-pointer shadow-md transition-shadow hover:shadow-lg"
                      onClick={() => router.push('/admin')}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      {t('nav.admin')}
                    </Button>
                  )}
                  <LanguageSwitcher />

                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-[38px] w-[38px] rounded-full">
                          <Avatar className="h-[38px] w-[38px]">
                            <AvatarImage src={user.avatar || undefined} />
                            <AvatarFallback className="from-brand to-brand-600 bg-gradient-to-br text-white">
                              {user.name?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="shadow-brand/40 w-56 rounded-2xl bg-white/95 shadow-2xl drop-shadow-2xl backdrop-blur-md"
                        align="end"
                        forceMount
                      >
                        <DropdownMenuItem
                          onClick={() => router.push('/profile')}
                          className="cursor-pointer bg-white hover:bg-gray-50 focus:bg-gray-50"
                        >
                          <User className="mr-2 h-4 w-4" />
                          {t('nav.editProfile')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleSignOut}
                          className="cursor-pointer bg-white text-red-600 hover:bg-gray-50 focus:bg-gray-50 focus:text-red-600"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          {t('common.signOut')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAuthMode('signin');
                      setAuthModalOpen(true);
                    }}
                  >
                    {t('common.signIn')}
                  </Button>
                  <Button
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthModalOpen(true);
                    }}
                  >
                    {t('common.signUp')}
                  </Button>
                  <LanguageSwitcher />
                </>
              )}
            </div>

            {/* Mobile menu button and language switcher */}
            <div className="flex items-center gap-2 md:hidden">
              <LanguageSwitcher />
              <Button
                variant="outline"
                size="sm"
                aria-expanded={isMobileOpen}
                aria-controls="mobile-nav"
                onClick={() => setIsMobileOpen((o) => !o)}
              >
                {isMobileOpen ? (
                  <CloseIcon className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <MenuIcon className="h-5 w-5" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Panel */}
      <div
        id="mobile-nav"
        className={`sticky top-16 z-40 bg-white/95 backdrop-blur md:hidden ${isMobileOpen ? 'block' : 'hidden'}`}
      >
        <div className="mx-auto max-w-7xl space-y-2 px-4 py-3 sm:px-6 lg:px-8">
          {isAuthLoading ? null : isAuthenticated && user ? (
            <>
              <button
                className="flex w-full items-center rounded-md px-3 py-2 text-left hover:bg-gray-100"
                onClick={() => {
                  setIsMobileOpen(false);
                  router.push('/articles');
                }}
              >
                <FileText className="mr-2 h-4 w-4" /> {t('nav.articles')}
              </button>
              {isAdmin(user.role) && (
                <button
                  className="flex w-full items-center rounded-md px-3 py-2 text-left hover:bg-gray-100"
                  onClick={() => {
                    setIsMobileOpen(false);
                    router.push('/admin');
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" /> {t('nav.admin')}
                </button>
              )}
              <button
                className="flex w-full items-center rounded-md px-3 py-2 text-left hover:bg-gray-100"
                onClick={() => {
                  setIsMobileOpen(false);
                  router.push('/profile');
                }}
              >
                <User className="mr-2 h-4 w-4" /> {t('nav.editProfile')}
              </button>
              <button
                className="flex w-full items-center rounded-md px-3 py-2 text-left text-red-600 hover:bg-gray-100"
                onClick={() => {
                  setIsMobileOpen(false);
                  handleSignOut();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> {t('common.signOut')}
              </button>
            </>
          ) : (
            <>
              <button
                className="w-full rounded-md px-3 py-2 text-left hover:bg-gray-100"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthModalOpen(true);
                  setIsMobileOpen(false);
                }}
              >
                {t('common.signIn')}
              </button>
              <button
                className="w-full rounded-md px-3 py-2 text-left hover:bg-gray-100"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthModalOpen(true);
                  setIsMobileOpen(false);
                }}
              >
                {t('common.signUp')}
              </button>
            </>
          )}
        </div>
      </div>

      <AuthModal />
    </>
  );
}
