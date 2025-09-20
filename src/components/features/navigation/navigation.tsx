'use client';

import { signOut } from 'next-auth/react';
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
import { useAuthStore, useUIStore } from '@/stores';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import Image from 'next/image';

export function Navigation() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const { setAuthModalOpen, setAuthMode } = useUIStore();
  const router = useRouter();
  const pathname = usePathname();

  // Ensure the auth store stays in sync with NextAuth session
  const { isAuthenticated: sessionAuthenticated } = useAuth();

  const handleSignOut = async () => {
    // Optimistic UI: clear local auth state immediately to avoid flicker
    try {
      logout();
      router.refresh();
    } catch {}
    try {
      await signOut({ redirect: false });
    } finally {
      // Hard redirect to ensure cookies/session are cleared in UI
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        router.push('/');
        router.refresh();
      }
    }
  };

  const handleHomeClick = () => {
    if (pathname !== '/') {
      router.push('/');
    } else {
      // If already on home page, just refresh
      router.refresh();
    }
  };


  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-gray-200/50 bg-white/80 shadow-lg backdrop-blur-md">
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
              <span className="bg-gradient-to-r from-[#4ECDC4] to-[#FF6B6B] bg-clip-text text-[22px] sm:text-2xl font-semibold tracking-tight leading-tight text-transparent">
                CodeVN
              </span>
            </button>

            {/* Navigation Items - Desktop */}
            <div className="hidden items-center space-x-4 md:flex">
              {(sessionAuthenticated || isAuthenticated) && user ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => router.push('/articles')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Articles
                  </Button>

                  {user.role === 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => router.push('/admin')}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Admin
                    </Button>
                  )}

                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                              {user.name?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-56 rounded-md border border-gray-200 bg-white shadow-lg"
                        align="end"
                        forceMount
                      >
                        <DropdownMenuItem
                          onClick={() => router.push('/profile')}
                          className="cursor-pointer bg-white hover:bg-gray-50 focus:bg-gray-50"
                        >
                          <User className="mr-2 h-4 w-4" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleSignOut}
                          className="cursor-pointer bg-white text-red-600 hover:bg-gray-50 focus:bg-gray-50 focus:text-red-600"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign Out
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
                    Sign In
                  </Button>
                  <Button
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthModalOpen(true);
                    }}
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
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
        className={`border-b border-gray-200/50 bg-white/95 backdrop-blur md:hidden ${isMobileOpen ? 'block' : 'hidden'}`}
      >
        <div className="mx-auto max-w-7xl space-y-2 px-4 py-3 sm:px-6 lg:px-8">
          {(sessionAuthenticated || isAuthenticated) && user ? (
            <>
              <button
                className="flex w-full items-center rounded-md px-3 py-2 text-left hover:bg-gray-100"
                onClick={() => {
                  setIsMobileOpen(false);
                  router.push('/articles');
                }}
              >
                <FileText className="mr-2 h-4 w-4" /> Articles
              </button>
              {user.role === 'admin' && (
                <button
                  className="flex w-full items-center rounded-md px-3 py-2 text-left hover:bg-gray-100"
                  onClick={() => {
                    setIsMobileOpen(false);
                    router.push('/admin');
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" /> Admin
                </button>
              )}
              <button
                className="flex w-full items-center rounded-md px-3 py-2 text-left hover:bg-gray-100"
                onClick={() => {
                  setIsMobileOpen(false);
                  router.push('/profile');
                }}
              >
                <User className="mr-2 h-4 w-4" /> Edit Profile
              </button>
              <button
                className="flex w-full items-center rounded-md px-3 py-2 text-left text-red-600 hover:bg-gray-100"
                onClick={() => {
                  setIsMobileOpen(false);
                  handleSignOut();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
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
                Sign In
              </button>
              <button
                className="w-full rounded-md px-3 py-2 text-left hover:bg-gray-100"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthModalOpen(true);
                  setIsMobileOpen(false);
                }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>

      <AuthModal />
    </>
  );
}
