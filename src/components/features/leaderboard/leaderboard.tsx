'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Medal,
  Award,
  Eye,
  ThumbsUp,
  MessageSquare,
  FileText,
  MessageCircle,
  User as UserIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LeaderboardEntry } from '@/types/shared/user';
import { useI18n } from '@/components/providers';
import { useAuthState } from '@/hooks/use-auth-state';
import { useChat } from '@/components/features/chat/chat-context';
import { useUIStore, useLeaderboardStore } from '@/stores';
import { useRouter } from 'next/navigation';

interface LeaderboardProps {
  className?: string;
  variant?: 'compact' | 'page';
  limit?: number;
}

export function Leaderboard({ className = '', variant = 'compact', limit }: LeaderboardProps) {
  const { t } = useI18n();
  const { user: currentUser, isAuthenticated } = useAuthState();
  const { handleStartChat } = useChat();
  const { setAuthModalOpen, setAuthMode } = useUIStore();
  const router = useRouter();
  const { fetchLeaderboard, getCachedData } = useLeaderboardStore();

  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('7d');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const isPageVariant = variant === 'page';
  const fetchLimit = typeof limit === 'number' ? limit : isPageVariant ? 100 : 10;
  const onTimeframeClick = (tf: '7d' | '30d' | '90d' | '1y' | 'all') => {
    if (tf === timeframe) return;
    setTimeframe(tf);
  };

  const loadLeaderboard = useCallback(
    async (selectedTimeframe: '7d' | '30d' | '90d' | '1y' | 'all') => {
      try {
        setIsLoading(true);
        setError(null);

        // Check cache first
        const cachedData = getCachedData(selectedTimeframe, fetchLimit);
        if (cachedData) {
          setLeaderboard(cachedData);
          setIsLoading(false);
          return;
        }

        // Fetch from API (will be cached by the store)
        const data = await fetchLeaderboard(selectedTimeframe, fetchLimit);
        setLeaderboard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setIsLoading(false);
      }
    },
    [fetchLimit, fetchLeaderboard, getCachedData]
  );

  useEffect(() => {
    loadLeaderboard(timeframe);
  }, [timeframe, loadLeaderboard]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element;
      if (!target.closest('[data-dropdown-container]')) {
        setOpenDropdownId(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChat = (user: any) => {
    if (!isAuthenticated) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      setOpenDropdownId(null);
      return;
    }
    handleStartChat(user.id, user.name || 'Unknown', user.avatar);
    setOpenDropdownId(null);
  };

  const handleViewProfile = (user: any) => {
    if (!isAuthenticated) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      setOpenDropdownId(null);
      return;
    }
    router.push(`/users/${user.id}`);
    setOpenDropdownId(null);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-600" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-500" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return (
          <span className={`${isPageVariant ? 'text-sm' : 'text-xs'} font-bold text-gray-500`}>
            {index + 1}
          </span>
        );
    }
  };

  const getRankBadgeColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-300';
      case 1:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-gray-300';
      case 2:
        return 'bg-gradient-to-r from-amber-100 to-amber-200 border-2 border-amber-300';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}b`;
    } else if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}m`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Sticky Timeframe Controls */}
      {isPageVariant && (
        <div className="sticky top-16 z-40 mb-6 rounded-xl bg-white/80 p-4 shadow-xl shadow-gray-300/60 backdrop-blur-sm">
          <div className="flex gap-1 sm:gap-2">
            {[
              { key: '7d', label: '7D' },
              { key: '30d', label: '30D' },
              { key: '90d', label: '90D' },
              { key: '1y', label: '1Y' },
              { key: 'all', label: 'All' },
            ].map(({ key, label }) => (
              <Button
                key={key}
                size="sm"
                variant={timeframe === key ? 'default' : 'back'}
                onClick={() => onTimeframeClick(key as '7d' | '30d' | '90d' | '1y' | 'all')}
                className={`flex-1 px-2 py-1.5 text-xs transition-all sm:flex-none sm:px-3 ${
                  timeframe === key ? 'bg-brand text-white shadow-md' : 'hover:bg-gray-100'
                }`}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Compact variant header */}
      {!isPageVariant && (
        <div className="mb-6">
          <div className="flex gap-1 sm:gap-2">
            {[
              { key: '7d', label: '7D' },
              { key: '30d', label: '30D' },
              { key: '90d', label: '90D' },
              { key: '1y', label: '1Y' },
              { key: 'all', label: 'All' },
            ].map(({ key, label }) => (
              <Button
                key={key}
                size="sm"
                variant={timeframe === key ? 'default' : 'back'}
                onClick={() => onTimeframeClick(key as '7d' | '30d' | '90d' | '1y' | 'all')}
                className={`flex-1 px-2 py-1.5 text-xs transition-all sm:flex-none sm:px-3 ${
                  timeframe === key ? 'bg-brand text-white shadow-md' : 'hover:bg-gray-100'
                }`}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-3">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex min-h-[72px] items-center gap-3 rounded-xl border border-gray-200/70 p-3"
                  >
                    {/* Rank badge */}
                    <Skeleton className="h-6 w-6 rounded-full sm:h-8 sm:w-8" />
                    {/* Avatar */}
                    <Skeleton className="h-8 w-8 rounded-full" />
                    {/* Text */}
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-10" />
                        <Skeleton className="h-3 w-10" />
                        <Skeleton className="h-3 w-10" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : error ? (
            <div className="text-center">
              <p className="mb-4 text-red-600">{error}</p>
              <Button onClick={() => loadLeaderboard(timeframe)} size="sm">
                {t('leaderboard.tryAgain')}
              </Button>
            </div>
          ) : (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              {leaderboard.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="py-8 text-center"
                >
                  <Trophy className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p className="text-gray-500" suppressHydrationWarning>
                    {t('leaderboard.noData')}
                  </p>
                </motion.div>
              ) : (
                leaderboard.map((entry, index) => {
                  const isDropdownOpen = openDropdownId === entry.user.id;

                  return (
                    <motion.div
                      key={entry.user.id}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      className="relative"
                      data-dropdown-container
                    >
                      <div
                        className={`flex min-h-[72px] cursor-pointer items-center gap-3 rounded-xl p-3 ${
                          index < 3
                            ? 'border border-gray-200 bg-gradient-to-r from-gray-50 to-white'
                            : 'hover:bg-brand/10'
                        }`}
                        onClick={() => setOpenDropdownId(isDropdownOpen ? null : entry.user.id)}
                      >
                        {/* Rank */}
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full sm:h-8 sm:w-8 ${getRankBadgeColor(index)}`}
                        >
                          {getRankIcon(index)}
                        </div>

                        {/* User Avatar */}
                        <div className="flex-shrink-0">
                          <div className="transition-transform hover:scale-110">
                            <Avatar className={isPageVariant ? 'h-10 w-10' : 'h-6 w-6'}>
                              <AvatarImage src={entry.user.avatar || undefined} />
                              <AvatarFallback
                                className={`from-brand to-brand-600 bg-gradient-to-br font-bold text-white ${isPageVariant ? 'text-sm' : 'text-[10px]'}`}
                              >
                                {entry.user.name?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>

                        {/* User Info & Stats */}
                        <div className="min-w-0 flex-1">
                          <div className="mb-1">
                            <h3
                              className={`truncate font-semibold text-gray-900 ${isPageVariant ? 'text-sm' : 'text-xs sm:text-sm'}`}
                            >
                              {entry.user.name || 'Unknown User'}
                            </h3>
                          </div>

                          {/* Stats Row */}
                          {isPageVariant ? (
                            <div className="mt-1 grid grid-cols-4 gap-3 text-[13px] sm:text-sm">
                              <div className="flex items-center gap-1.5">
                                <FileText className="text-brand h-4 w-4" />
                                <span className="text-brand font-medium tabular-nums">
                                  {formatNumber(entry.stats.posts)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Eye className="text-brand h-4 w-4" />
                                <span className="text-brand font-medium tabular-nums">
                                  {formatNumber(entry.stats.views)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <ThumbsUp className="text-brand h-4 w-4" />
                                <span className="text-brand font-medium tabular-nums">
                                  {formatNumber(entry.stats.likes)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MessageSquare className="text-brand h-4 w-4" />
                                <span className="text-brand font-medium tabular-nums">
                                  {formatNumber(entry.stats.comments)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <FileText className="text-brand h-4 w-4" />
                                <span className="text-brand font-medium tabular-nums">
                                  {formatNumber(entry.stats.posts)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Eye className="text-brand h-4 w-4" />
                                <span className="text-brand font-medium tabular-nums">
                                  {formatNumber(entry.stats.views)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <ThumbsUp className="text-brand h-4 w-4" />
                                <span className="text-brand font-medium tabular-nums">
                                  {formatNumber(entry.stats.likes)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MessageSquare className="text-brand h-4 w-4" />
                                <span className="text-brand font-medium tabular-nums">
                                  {formatNumber(entry.stats.comments)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Custom Dropdown */}
                      {isDropdownOpen && (
                        <div className="absolute top-full left-0 z-[100] mt-2 w-40 rounded-2xl bg-white shadow-2xl">
                          <div className="py-1">
                            {/* View Profile button */}
                            <div className="py-1">
                              <button
                                onClick={() => handleViewProfile(entry.user)}
                                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-900 transition-colors hover:bg-gray-50"
                              >
                                <UserIcon className="h-4 w-4 text-gray-700" />
                                <span>View Profile</span>
                              </button>
                            </div>
                            {/* Chat button (hide when current user) */}
                            {currentUser?.id !== entry.user.id && (
                              <div className="py-1">
                                <button
                                  onClick={() => handleChat(entry.user)}
                                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-900 transition-colors hover:bg-gray-50"
                                >
                                  <MessageCircle className="h-4 w-4 text-gray-700" />
                                  <span>Chat</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
