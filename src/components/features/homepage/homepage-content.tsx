'use client';

import { useEffect, useRef, useState } from 'react';
import { MotionContainer } from './motion-lite';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useForumStore } from '@/stores';
import { useAuthState } from '@/hooks/use-auth-state';
import { findCategoryById } from '@/features/articles/category-utils';
import { apiGet } from '@/lib/utils';
import { Category, ArticleListResponse, Article } from '@/types/shared';
import { useI18n } from '@/components/providers';
import dynamic from 'next/dynamic';
import { FeaturedArticles } from './featured-articles';
import { ArticlesFilters } from './articles-filters';
import { ArticlesList } from './articles-list';
const AboutSidebar = dynamic(() => import('./about-sidebar').then((m) => m.AboutSidebar), {
  ssr: false,
  loading: () => null,
});
const LeaderboardSidebar = dynamic(
  () => import('./leaderboard-sidebar').then((m) => m.LeaderboardSidebar),
  { ssr: false, loading: () => null }
);

interface HomepageInitialDataProps {
  initialCategories?: Category[];
  initialArticles?: Article[];
  initialHasMore?: boolean;
  initialFeatured?: Article[];
}

export function HomepageContent({
  initialCategories,
  initialArticles,
  initialHasMore,
  initialFeatured,
}: HomepageInitialDataProps = {}) {
  const { t: _t } = useI18n();
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

  const [featuredArticles, setFeaturedArticles] = useState<Article[]>(initialFeatured || []);
  const [isXL, setIsXL] = useState(false);

  // Detect xl viewport for loading sidebars only on large screens
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1280px)');
    const update = () => setIsXL(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (Array.isArray(initialFeatured) && initialFeatured.length > 0) return;
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
  }, [initialFeatured]);

  // Hydrate store from server data once on mount
  useEffect(() => {
    let didHydrate = false;
    if (Array.isArray(initialCategories) && initialCategories.length > 0) {
      setCategories(initialCategories);
      didHydrate = true;
    }
    if (Array.isArray(initialArticles) && initialArticles.length > 0) {
      setArticles(initialArticles);
      setHasMoreArticles(Boolean(initialHasMore));
      initialPageLoadedRef.current = true;
      lastLoadedPageRef.current = 1;
    }
    if (didHydrate) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Helper functions for category handling
  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategoryNames((prev) =>
      prev.includes(categoryName) ? prev.filter((x) => x !== categoryName) : [...prev, categoryName]
    );
  };

  const handleCategoryToggle = (id: string) => {
    const cat = getCategoryById(id);
    if (!cat) return;
    const namesToToggle = getDescendantNames(cat.name).map((name) => name.toLowerCase());
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
  };

  const handleClearFilters = () => {
    const canClear = onlyMine || selectedCategoryNames.length > 0 || !!debouncedSearch;
    if (!canClear) return;
    setOnlyMine(false);
    setSelectedCategoryNames([]);
    setSearchTerm('');
  };

  return (
    <div className="py-6">
      {/* Main Content with Leaderboard */}
      <div className="2xl:max-w-8xl relative mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        {/* About (left) only render/load on xl+ to reduce mobile JS */}
        {isXL && (
          <div className="hidden xl:block">
            <AboutSidebar mounted={mounted} />
          </div>
        )}

        {/* Featured Articles Section */}
        <FeaturedArticles
          featuredArticles={featuredArticles}
          mounted={mounted}
          onCategoryClick={handleCategoryClick}
        />

        {/* Articles Section */}
        <div>
          <MotionContainer className="rounded-2xl bg-white p-5 shadow-2xl sm:p-6 lg:p-6">
            <ArticlesFilters
              categories={categories}
              selectedCategoryNames={selectedCategoryNames}
              searchTerm={searchTerm}
              onlyMine={onlyMine}
              isAuthenticated={isAuthenticated}
              mounted={mounted}
              onSearchChange={setSearchTerm}
              onCategoryToggle={handleCategoryToggle}
              onOnlyMineToggle={() => setOnlyMine((v) => !v)}
              onClearFilters={handleClearFilters}
              onCategoryClick={handleCategoryClick}
              getCategoryById={getCategoryById}
              getCategoryByName={getCategoryByName}
            />

            <ArticlesList
              articles={articles}
              selectedCategoryNames={selectedCategoryNames}
              mounted={mounted}
              isLoadingMore={isLoadingMore}
              hasMoreArticles={hasMoreArticles}
              isLoading={isLoading}
              onCategoryClick={handleCategoryClick}
              onClearFilters={handleClearFilters}
              loadMoreRef={loadMoreRef}
            />
          </MotionContainer>
        </div>

        {/* Leaderboard only render/load on xl+ */}
        {isXL && <LeaderboardSidebar mounted={mounted} />}
      </div>
      {/* BackToTop is now global in layout */}
    </div>
  );
}
