import { create } from 'zustand';
import { Category, Article } from '@/types/shared';

// Re-export for backward compatibility
export type { Category, Article };

interface ForumState {
  // Data
  categories: Category[];
  articles: Article[];
  currentArticle: Article | null;

  // UI State
  searchTerm: string;
  isLoading: boolean;
  error: string | null;

  // Pagination
  articlesPage: number;
  hasMoreArticles: boolean;

  // Actions
  setCategories: (categories: Category[]) => void;
  addCategories: (categories: Category[]) => void;
  setArticles: (articles: Article[]) => void;
  addArticles: (articles: Article[]) => void;
  setCurrentArticle: (article: Article | null) => void;
  setSearchTerm: (term: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setArticlesPage: (page: number) => void;
  setHasMoreArticles: (hasMore: boolean) => void;
  updateArticle: (id: string, updates: Partial<Article>) => void;
  removeArticle: (id: string) => void;
  clearForum: () => void;
}

export const useForumStore = create<ForumState>((set) => ({
  // Initial state
  categories: [],
  articles: [],
  currentArticle: null,
  searchTerm: '',
  isLoading: false,
  error: null,
  articlesPage: 1,
  hasMoreArticles: true,

  // Actions
  setCategories: (categories) => {
    set({ categories });
  },

  addCategories: (categories) => {
    set((state) => ({
      categories: [...state.categories, ...categories],
    }));
  },

  setArticles: (articles) => {
    const unique = Array.isArray(articles)
      ? Array.from(new Map(articles.map((a) => [a.id, a])).values())
      : [];
    set({ articles: unique });
  },

  addArticles: (articles) => {
    set((state) => {
      const map = new Map<string, import('@/types/shared').Article>();
      for (const a of state.articles) map.set(a.id, a);
      for (const a of articles) if (!map.has(a.id)) map.set(a.id, a);
      return { articles: Array.from(map.values()) };
    });
  },

  setCurrentArticle: (article) => {
    set({ currentArticle: article });
  },

  setSearchTerm: (term) => {
    set({ searchTerm: term });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  setArticlesPage: (page) => {
    set({ articlesPage: page });
  },

  setHasMoreArticles: (hasMore) => {
    set({ hasMoreArticles: hasMore });
  },

  updateArticle: (id, updates) => {
    set((state) => ({
      articles: state.articles.map((article) =>
        article.id === id ? { ...article, ...updates } : article
      ),
    }));
  },

  removeArticle: (id) => {
    set((state) => ({
      articles: state.articles.filter((article) => article.id !== id),
    }));
  },

  clearForum: () => {
    set({
      categories: [],
      articles: [],
      currentArticle: null,
      searchTerm: '',
      error: null,
      articlesPage: 1,
      hasMoreArticles: true,
    });
  },
}));
