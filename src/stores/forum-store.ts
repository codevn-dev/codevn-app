import { create } from 'zustand';

export interface Category {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  color: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  parent?: Category | null;
  children?: Category[];
  _count: {
    articles: number;
    children: number;
  };
}

export interface Article {
  id: string;
  title: string;
  content: string;
  slug: string;
  thumbnail?: string;
  categoryId: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  category: {
    id: string;
    name: string;
    color: string;
  };
  _count: {
    comments: number;
    likes: number;
  };
}

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
    set({ articles });
  },

  addArticles: (articles) => {
    set((state) => ({
      articles: [...state.articles, ...articles],
    }));
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
