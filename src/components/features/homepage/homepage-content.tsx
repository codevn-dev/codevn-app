'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { siteConfig } from '@/config/config';
import { motion } from 'framer-motion';
import { MotionContainer } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import GitHubIcon from '@/icons/github.svg';
import FacebookIcon from '@/icons/facebook.svg';
import {
  MessageSquare,
  BookOpen,
  Calendar,
  Eye,
  X,
  ThumbsUp,
  Trophy,
  ExternalLink,
} from 'lucide-react';
import { useForumStore } from '@/stores';
import { CategorySelector } from '@/features/articles';
import { useAuthState } from '@/hooks/use-auth-state';
import { findCategoryById } from '@/features/articles';
import { Leaderboard } from '@/features/leaderboard';
import { apiGet } from '@/lib/utils';
import { Category, ArticleListResponse, Article } from '@/types/shared';
import { formatDateTime } from '@/lib/utils/time-format';
import { useI18n } from '@/components/providers';

export function HomepageContent() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthState();
  const {
    categories,
    articles,
    isLoading,
    error,
    setCategories,
    setArticles,
    addArticles,
    setLoading,
    setError,
    articlesPage,
    setArticlesPage,
    hasMoreArticles,
    setHasMoreArticles,
  } = useForumStore();

  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isFiltersInitializedRef = useRef(false);
  const lastFetchKeyRef = useRef<string | null>(null);
  const isFetchInFlightRef = useRef(false);
  const initialPageLoadedRef = useRef(false);
  const isPaginatingRef = useRef(false);
  const articlesPageRef = useRef(articlesPage);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastLoadedFilterSigRef = useRef<string | null>(null);
  const lastLoadedPageRef = useRef<number>(0);
  const prevFilterSigRef = useRef<string | null>(null);

  // Stable derived keys for deps
  const selectedNamesKey = selectedCategoryNames.join(',');
  const filterSigBase = `${[...selectedCategoryNames].sort().join(',')}|${onlyMine ? '1' : '0'}|${debouncedSearch}`;
  const authUserId = user?.id || '';

  // Helpers
  const getCategoryById = (id: string) => findCategoryById(categories, id);
  const getCategoryByName = (name: string) => {
    const target = name.toLowerCase();
    const dfs = (list: typeof categories): (typeof categories)[number] | undefined => {
      for (const c of list) {
        if (c.name.toLowerCase() === target) return c;
        if (Array.isArray(c.children) && c.children.length > 0) {
          const found = dfs(c.children as any);
          if (found) return found;
        }
      }
      return undefined;
    };
    return dfs(categories);
  };
  const getDescendantNames = (name: string): string[] => {
    const cat = getCategoryByName(name);
    if (!cat) return [];
    const childNames = (cat.children || []).map((c) => c.name);
    return [name, ...childNames];
  };

  // Fetch categories once
  useEffect(() => {
    const fetchCategoriesOnce = async () => {
      try {
        const categoriesData = await apiGet<Category[]>('/api/categories');
        setCategories(categoriesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };
    fetchCategoriesOnce();
  }, [setCategories, setError]);

  // Read filters from URL on first load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const names = (params.get('categories') || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const mine = params.get('mine') === '1';
    const initialSearch = (params.get('search') || '').trim();
    if (names.length > 0) setSelectedCategoryNames(names);
    if (mine) setOnlyMine(true);
    if (initialSearch) {
      setSearchTerm(initialSearch);
      setDebouncedSearch(initialSearch);
    }
    isFiltersInitializedRef.current = true;
  }, []);

  // Debounce searchTerm → debouncedSearch
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  // Fetch articles with pagination and server-side filters
  useEffect(() => {
    if (!isFiltersInitializedRef.current) return; // wait until URL filters parsed
    if (onlyMine && (isAuthLoading || !isAuthenticated || !authUserId)) return; // wait for auth

    const fetchArticlesPage = async () => {
      const filterSig = `${filterSigBase}|${isAuthenticated && authUserId ? authUserId : ''}`;

      // Prevent refetching page=1 for the same filters once it's already loaded
      // Only block duplicate fetch for the same page+filters (not just page 1)
      if (
        lastLoadedFilterSigRef.current === filterSig &&
        lastLoadedPageRef.current === articlesPage
      ) {
        return;
      }
      const params = new URLSearchParams({
        publishedOnly: 'true',
        page: String(articlesPage),
        limit: '9',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      if (selectedCategoryNames.length > 0)
        params.set('categories', selectedCategoryNames.map((name) => name.toLowerCase()).join(','));
      if (onlyMine && isAuthenticated && authUserId) params.set('authorId', authUserId);
      if (debouncedSearch) params.set('search', debouncedSearch);
      const fetchKey = params.toString();

      if (isFetchInFlightRef.current && lastFetchKeyRef.current === fetchKey) return; // in-flight duplicate
      if (lastFetchKeyRef.current === fetchKey) return; // already fetched with same key

      isFetchInFlightRef.current = true;
      lastFetchKeyRef.current = fetchKey;

      // Match My Articles: only show page-level loading on the very first load
      setLoading(!initialPageLoadedRef.current);
      setIsLoadingMore(articlesPage > 1);
      setError(null);
      let nextHasMore = hasMoreArticles;

      try {
        const res = await apiGet<ArticleListResponse>(`/api/articles?${fetchKey}`);
        if (articlesPage === 1) {
          setArticles(res.articles);
          initialPageLoadedRef.current = true;
        } else {
          addArticles(res.articles);
        }
        setHasMoreArticles(res.pagination.hasNext);
        nextHasMore = res.pagination.hasNext;

        // Mark last loaded page and filter signature
        lastLoadedFilterSigRef.current = filterSig;
        lastLoadedPageRef.current = articlesPage;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
        isFetchInFlightRef.current = false;
        isPaginatingRef.current = false;
        // Re-observe sentinel after load completes
        const el = loadMoreRef.current;
        if (el && nextHasMore) {
          observerRef.current?.observe(el);
        }
      }
    };

    fetchArticlesPage();
  }, [
    articlesPage,
    selectedNamesKey,
    selectedCategoryNames,
    onlyMine,
    isAuthenticated,
    isAuthLoading,
    authUserId,
    hasMoreArticles,
    filterSigBase,
    debouncedSearch,
    setArticles,
    addArticles,
    setHasMoreArticles,
    setLoading,
    setError,
  ]);

  // Reset to first page only when filters actually change
  useEffect(() => {
    if (!isFiltersInitializedRef.current) return;
    const sig = filterSigBase;
    if (prevFilterSigRef.current !== null && prevFilterSigRef.current !== sig) {
      setArticlesPage(1);
      // Reset last loaded markers so pagination restarts cleanly for new filters
      lastLoadedFilterSigRef.current = null;
      lastLoadedPageRef.current = 0;
    }
    prevFilterSigRef.current = sig;
  }, [filterSigBase, setArticlesPage]);

  // Keep a ref of latest page to avoid stale closure in observer
  useEffect(() => {
    articlesPageRef.current = articlesPage;
  }, [articlesPage]);

  // Sync filters to URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (selectedCategoryNames.length > 0)
      params.set('categories', selectedCategoryNames.map((name) => name.toLowerCase()).join(','));
    if (onlyMine) params.set('mine', '1');
    if (debouncedSearch) params.set('search', debouncedSearch);
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, [selectedCategoryNames, onlyMine, debouncedSearch]);

  // IntersectionObserver for lazy load
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    if (!initialPageLoadedRef.current) return; // do not trigger pagination until first page loaded

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first.isIntersecting &&
          hasMoreArticles &&
          !isLoadingMore &&
          !isLoading &&
          !isFetchInFlightRef.current &&
          !isPaginatingRef.current
        ) {
          isPaginatingRef.current = true;
          const nextPage = (articlesPageRef.current || 1) + 1;
          articlesPageRef.current = nextPage;
          setArticlesPage(nextPage);
          // Pause observing until the load finishes to avoid rapid retriggers
          observer.unobserve(el);
        }
      },
      { root: null, rootMargin: '200px 0px', threshold: 0.1 }
    );

    observer.observe(el);
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [hasMoreArticles, isLoadingMore, isLoading, setArticlesPage]);

  // Back-to-top is handled globally; no local scroll listener needed

  const filteredArticles = Array.isArray(articles)
    ? articles.filter((a) => (a as any)?.published === true)
    : [];

  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const params = new URLSearchParams({ limit: '3', windowDays: '14' });
        const res = await apiGet<{ articles: Article[] }>(`/api/articles/featured?${params}`);
        setFeaturedArticles(Array.isArray(res.articles) ? res.articles : []);
      } catch {
        setFeaturedArticles([]);
      }
    };
    fetchFeatured();
  }, []);

  if (isLoading && !initialPageLoadedRef.current) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-red-600">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Main Content with Leaderboard */}
      <div className="2xl:max-w-8xl relative mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        {/* About (left) and Leaderboard (right) on xl+ */}
        <div className="hidden xl:block">
          {/* About box on the left */}
          <div className="xl:absolute xl:top-0 xl:left-[-320px] xl:w-[320px] xl:max-w-[360px] xl:min-w-[320px]">
            <div className="rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
              <h2
                className="bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-base font-extrabold text-transparent sm:text-lg"
                suppressHydrationWarning
              >
                {mounted ? t('about.title') : 'About CodeVN'}
              </h2>
              <p className="mt-2 text-sm text-gray-700" suppressHydrationWarning>
                {mounted ? t('about.greeting') : ''}
              </p>
              <p className="mt-3 text-sm text-gray-700" suppressHydrationWarning>
                {mounted ? t('about.p1') : ''}
              </p>

              <div className="mt-4 flex w-full items-center gap-2">
                <Link
                  href="/about"
                  aria-label="About"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 transition hover:bg-gray-50"
                >
                  <ExternalLink className="h-5 w-5 text-gray-700" />
                </Link>
                {siteConfig.links.github && (
                  <a
                    href={siteConfig.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 transition hover:bg-gray-50"
                  >
                    <GitHubIcon className="h-5 w-5" />
                  </a>
                )}
                {siteConfig.links.facebook && (
                  <a
                    href={siteConfig.links.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 transition hover:bg-gray-50"
                  >
                    <FacebookIcon className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Featured Articles Section */}
        {featuredArticles.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <MotionContainer>
              <div className="rounded-2xl bg-white p-5 shadow-2xl sm:p-6 lg:p-6">
                <div className="mb-4 sm:mb-6">
                  <h2
                    className="text-xl font-bold text-gray-900 sm:text-3xl"
                    suppressHydrationWarning
                  >
                    {mounted ? t('home.featured') : 'Featured'}
                  </h2>
                  <p className="text-gray-600" suppressHydrationWarning>
                    {mounted ? t('home.featuredSubtitle') : 'Top articles in the last 24 hours'}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {featuredArticles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/articles/${article.slug}`}
                      className="block h-full"
                    >
                      <div className="group hover:shadow-3xl shadow-brand/30 hover:shadow-brand/40 block flex h-full transform cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-2xl drop-shadow-2xl transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-[1.01]">
                        <div className="relative aspect-[16/9] w-full overflow-hidden">
                          {article.thumbnail ? (
                            <img
                              src={article.thumbnail}
                              alt={article.title}
                              className="h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-110 group-hover:brightness-110"
                            />
                          ) : (
                            <div
                              className="h-full w-full transition-all duration-500 ease-out group-hover:scale-110"
                              style={{
                                background: `linear-gradient(135deg, ${article.category.color}12, #ffffff)`,
                              }}
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100" />
                        </div>
                        <div className="flex flex-1 flex-col p-4 pb-3 sm:p-6 sm:pb-4">
                          <div className="mb-3 flex items-center justify-between sm:mb-4">
                            <button
                              className="inline-flex items-center rounded-full px-2.5 py-1.5 text-[10px] font-semibold sm:px-3 sm:text-xs"
                              style={{
                                backgroundColor: `${article.category.color}15`,
                                color: article.category.color,
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const name = article.category.name.toLowerCase();
                                setSelectedCategoryNames((prev) =>
                                  prev.includes(name)
                                    ? prev.filter((x) => x !== name)
                                    : [...prev, name]
                                );
                              }}
                            >
                              <div
                                className="mr-2 h-2 w-2 rounded-full"
                                style={{ backgroundColor: article.category.color }}
                              />
                              {article.category.name}
                            </button>
                            <div className="flex items-center text-xs text-gray-600">
                              <Calendar className="mr-1 h-3 w-3" />
                              {formatDateTime(article.createdAt)}
                            </div>
                          </div>
                          <h3 className="mb-2 line-clamp-2 flex-1 text-lg font-bold text-gray-900 sm:mb-3 sm:text-xl">
                            {article.title}
                          </h3>
                          <div className="flex items-center text-xs text-gray-700 sm:text-sm">
                            <div className="mr-2 sm:mr-3">
                              <Avatar className="h-6 w-6">
                                <AvatarImage
                                  src={article.author.avatar || undefined}
                                  alt={article.author.name}
                                />
                                <AvatarFallback className="text-[10px] font-bold">
                                  {article.author.name?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <span className="font-medium">{article.author.name}</span>
                          </div>
                        </div>
                        <div className="bg-gray-50/50 px-4 py-3 sm:px-6 sm:py-4">
                          <div className="grid grid-cols-3 text-xs text-gray-700 sm:text-sm">
                            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                              <Eye className="h-4 w-4 text-gray-600" />
                              <span className="font-medium tabular-nums">
                                {typeof article.views === 'number' ? article.views : 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                              <ThumbsUp className="h-4 w-4 text-gray-600" />
                              <span className="font-medium tabular-nums">
                                {article._count.likes}
                              </span>
                            </div>
                            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                              <MessageSquare className="h-4 w-4 text-gray-600" />
                              <span className="font-medium tabular-nums">
                                {article._count.comments}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </MotionContainer>
          </div>
        )}
        {/* Articles Section */}
        <div>
          <MotionContainer className="rounded-2xl bg-white p-5 shadow-2xl sm:p-6 lg:p-6">
            <div className="shadow-brand/30 z-40 mb-6 rounded-xl bg-white/80 p-4 shadow-2xl drop-shadow-2xl backdrop-blur-sm sm:mb-8">
              <CategorySelector
                categories={categories}
                selectedCategoryIds={selectedCategoryNames
                  .map((name) => {
                    const cat = getCategoryByName(name);
                    return cat ? cat.id : '';
                  })
                  .filter(Boolean)}
                onCategoryToggle={(id) => {
                  const cat = getCategoryById(id);
                  if (!cat) return;
                  const namesToToggle = getDescendantNames(cat.name).map((name) =>
                    name.toLowerCase()
                  );
                  setSelectedCategoryNames((prev) => {
                    const set = new Set(prev);
                    const hasAll = namesToToggle.every((x) => set.has(x));
                    if (hasAll) {
                      namesToToggle.forEach((x) => set.delete(x));
                    } else {
                      namesToToggle.forEach((x) => set.add(x));
                    }
                    return Array.from(set);
                  });
                }}
              />
              <div className="mt-3" />
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-search absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                  </svg>
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={mounted ? t('home.searchPlaceholder') : ''}
                    className="focus:ring-brand/20 w-full pl-10 focus:ring-2"
                  />
                </div>
                <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
                  {isAuthenticated && (
                    <Button
                      size="sm"
                      variant="back"
                      onClick={() => setOnlyMine((v) => !v)}
                      className={`px-3 transition-colors ${
                        onlyMine ? 'bg-brand/10 text-brand-600' : ''
                      }`}
                    >
                      <span suppressHydrationWarning>{mounted ? t('home.myArticles') : ''}</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="back"
                    onClick={() => {
                      const canClear =
                        onlyMine || selectedCategoryNames.length > 0 || !!debouncedSearch;
                      if (!canClear) return;
                      setOnlyMine(false);
                      setSelectedCategoryNames([]);
                      setSearchTerm('');
                    }}
                  >
                    <span suppressHydrationWarning>{mounted ? t('home.clearFilters') : ''}</span>
                  </Button>
                </div>
              </div>
              {selectedCategoryNames.length > 0 && (
                <div className="mt-2 flex items-center gap-2 sm:gap-3">
                  <span className="text-xs font-medium text-gray-700 sm:text-sm">Filtered by:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategoryNames.map((name) => {
                      const cat = getCategoryByName(name);
                      if (!cat) return null;
                      return (
                        <div
                          key={name}
                          className="flex items-center rounded-full px-3 py-1.5 text-xs font-semibold shadow-md shadow-gray-200/50 sm:px-4 sm:py-2 sm:text-sm"
                          style={{
                            backgroundColor: `${cat.color || '#3B82F6'}15`,
                            color: cat.color || '#3B82F6',
                          }}
                        >
                          <div
                            className="mr-2 h-2 w-2 rounded-full"
                            style={{ backgroundColor: cat.color || '#3B82F6' }}
                          />
                          {cat.name}
                          <button
                            onClick={() =>
                              setSelectedCategoryNames((prev) => prev.filter((x) => x !== name))
                            }
                            aria-label={`Remove ${cat.name}`}
                            title={`Remove ${cat.name}`}
                            className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-current hover:bg-current/10"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div>
              <h2
                className="mb-1 text-xl font-bold text-gray-900 sm:mb-2 sm:text-3xl"
                suppressHydrationWarning
              >
                {mounted ? t('home.latestArticles') : ''}
              </h2>
              <p className="mb-10 text-base text-gray-600 sm:text-lg" suppressHydrationWarning>
                {mounted ? t('home.tagline') : ''}
              </p>
            </div>
            {(() => {
              const containerVariants = {
                hidden: { opacity: 1 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.06, delayChildren: 0.02 },
                },
              } as const;

              const itemVariants = {
                hidden: { opacity: 0, y: 16, scale: 0.98 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 },
                },
              } as const;

              return (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3"
                >
                  {filteredArticles.map((article) => (
                    <motion.div
                      key={article.id}
                      variants={itemVariants}
                      whileHover={{
                        y: -12,
                        scale: 1.02,
                        transition: { type: 'spring', stiffness: 380, damping: 28 },
                      }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Link href={`/articles/${article.slug}`} className="block h-full">
                        <div className="group hover:shadow-3xl shadow-brand/30 hover:shadow-brand/40 block flex h-full transform cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-2xl drop-shadow-2xl transition-all duration-500 ease-out hover:-translate-y-4 hover:scale-[1.02]">
                          {/* Thumbnail (consistent height whether exists or not) */}
                          <div className="relative aspect-[16/9] w-full overflow-hidden">
                            {article.thumbnail ? (
                              <img
                                src={article.thumbnail}
                                alt={article.title}
                                className="h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-110 group-hover:brightness-110"
                              />
                            ) : (
                              <div
                                className="h-full w-full transition-all duration-500 ease-out group-hover:scale-110"
                                style={{
                                  background: `linear-gradient(135deg, ${article.category.color}12, #ffffff)`,
                                }}
                              />
                            )}
                            {/* Overlay effect */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100" />
                          </div>

                          {/* Article Header */}
                          <div className="flex flex-1 flex-col p-4 pb-3 sm:p-6 sm:pb-4">
                            <div className="mb-3 flex items-center justify-between sm:mb-4">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const categoryName = article.category.name.toLowerCase();
                                  setSelectedCategoryNames((prev) =>
                                    prev.includes(categoryName)
                                      ? prev.filter((x) => x !== categoryName)
                                      : [...prev, categoryName]
                                  );
                                }}
                                className="inline-flex items-center rounded-full px-2.5 py-1.5 text-[10px] font-semibold sm:px-3 sm:text-xs"
                                style={{
                                  backgroundColor: `${article.category.color}15`,
                                  color: article.category.color,
                                }}
                              >
                                <div
                                  className="mr-2 h-2 w-2 rounded-full"
                                  style={{ backgroundColor: article.category.color }}
                                />
                                {article.category.name}
                              </button>
                              <div className="flex items-center text-xs text-gray-600">
                                <Calendar className="mr-1 h-3 w-3" />
                                {formatDateTime(article.createdAt)}
                              </div>
                            </div>

                            <h3 className="group-hover:text-brand mb-2 line-clamp-2 flex-1 text-lg font-bold text-gray-900 transition-all duration-300 ease-out group-hover:scale-[1.02] sm:mb-3 sm:text-xl">
                              {article.title}
                            </h3>

                            <div className="flex items-center text-xs text-gray-700 transition-all duration-300 ease-out group-hover:translate-x-1 sm:text-sm">
                              <div className="mr-2 sm:mr-3">
                                <Avatar className="h-6 w-6 transition-all duration-300 ease-out group-hover:scale-110 group-hover:shadow-lg">
                                  <AvatarImage
                                    src={article.author.avatar || undefined}
                                    alt={article.author.name}
                                  />
                                  <AvatarFallback className="text-[10px] font-bold">
                                    {article.author.name?.charAt(0).toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <span className="group-hover:text-brand font-medium transition-colors duration-300 ease-out">
                                {article.author.name}
                              </span>
                            </div>
                          </div>

                          {/* Article Footer */}
                          <div className="group-hover:from-brand/5 group-hover:to-brand-700/5 bg-gray-50/50 px-4 py-3 transition-all duration-300 ease-out group-hover:bg-gradient-to-r sm:px-6 sm:py-4">
                            <div className="grid grid-cols-3 text-xs text-gray-700 sm:text-sm">
                              {/* Views - Left */}
                              <div className="flex items-center justify-center gap-1.5 transition-all duration-300 ease-out group-hover:scale-105 sm:gap-2">
                                <Eye className="group-hover:text-brand h-4 w-4 text-gray-600 transition-all duration-300 ease-out group-hover:scale-110" />
                                <span
                                  className="group-hover:text-brand font-medium tabular-nums transition-colors duration-300 ease-out"
                                  aria-label="views count"
                                >
                                  {typeof article.views === 'number' ? article.views : 0}
                                </span>
                              </div>
                              {/* Likes - Center */}
                              <div className="flex items-center justify-center gap-1.5 transition-all duration-300 ease-out group-hover:scale-105 sm:gap-2">
                                <ThumbsUp
                                  className="group-hover:text-brand h-4 w-4 text-gray-600 transition-all duration-300 ease-out group-hover:scale-110"
                                  aria-hidden="true"
                                />
                                <span
                                  className="group-hover:text-brand font-medium tabular-nums transition-colors duration-300 ease-out"
                                  aria-label="likes count"
                                >
                                  {article._count?.likes ?? 0}
                                </span>
                              </div>
                              {/* Comments - Right */}
                              <div className="flex items-center justify-center gap-1.5 transition-all duration-300 ease-out group-hover:scale-105 sm:gap-2">
                                <MessageSquare
                                  className="group-hover:text-brand h-4 w-4 text-gray-600 transition-all duration-300 ease-out group-hover:scale-110"
                                  aria-hidden="true"
                                />
                                <span
                                  className="group-hover:text-brand font-medium tabular-nums transition-colors duration-300 ease-out"
                                  aria-label="comments count"
                                >
                                  {article._count?.comments ?? 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              );
            })()}

            {filteredArticles.length === 0 && (
              <div className="px-4 py-12 text-center sm:py-16">
                <div className="from-brand/20 to-brand-700/20 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br sm:mb-6 sm:h-20 sm:w-20">
                  <BookOpen className="text-brand h-8 w-8 sm:h-10 sm:w-10" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 sm:mb-3 sm:text-2xl">
                  No articles found
                </h3>
                <p className="mx-auto mb-6 max-w-md text-base text-gray-700 sm:mb-8 sm:text-lg">
                  {selectedCategoryNames.length > 0
                    ? "Try adjusting your filter criteria to find what you're looking for."
                    : 'Be the first to share your knowledge with the community!'}
                </p>
                <Button
                  size="sm"
                  variant="back"
                  onClick={() => {
                    setOnlyMine(false);
                    setSelectedCategoryNames([]);
                    setSearchTerm('');
                  }}
                >
                  {selectedCategoryNames.length > 0 ? 'Clear Filters' : 'Explore Topics'}
                </Button>
              </div>
            )}

            {/* Lazy load sentinel */}
            <MotionContainer delay={0.02}>
              <div ref={loadMoreRef} className="h-10 w-full" />
            </MotionContainer>
            {isLoadingMore && (
              <MotionContainer delay={0.04}>
                <div className="mt-2 rounded-lg bg-white/40 py-2 text-center text-sm text-gray-600 shadow-md shadow-gray-200/50 backdrop-blur-sm">
                  Loading more...
                </div>
              </MotionContainer>
            )}
            {!isLoadingMore && !isLoading && !hasMoreArticles && filteredArticles.length > 0 && (
              <div className="mt-3 text-center text-sm text-gray-500" suppressHydrationWarning>
                {mounted ? t('home.noMore') : ''}
              </div>
            )}
          </MotionContainer>
        </div>

        {/* Leaderboard Section - Hidden on mobile, only show on xl+ screens */}
        <div className="hidden xl:absolute xl:top-0 xl:right-[-320px] xl:block xl:w-[320px] xl:max-w-[400px] xl:min-w-[320px] xl:flex-1">
          <div className="sticky top-6">
            <div className="rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center justify-center gap-2">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                  <h2
                    className="text-lg font-bold text-gray-900 sm:text-xl"
                    suppressHydrationWarning
                  >
                    {mounted ? t('leaderboard.title') : ''}
                  </h2>
                </div>
              </div>
              <Leaderboard />
            </div>
          </div>
        </div>
      </div>
      {/* BackToTop is now global in layout */}
    </div>
  );
}
