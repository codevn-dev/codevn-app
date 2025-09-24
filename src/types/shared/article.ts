export interface Article {
  id: string;
  title: string;
  content: string;
  slug: string;
  thumbnail?: string;
  categoryId: string;
  published: boolean;
  createdAt: Date | string;
  updatedAt: Date | string | null;
  author: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  category: {
    id: string;
    name: string;
    color: string;
    slug: string;
  };
  _count: {
    comments: number;
    likes: number;
    unlikes: number;
  };
  userHasLiked?: boolean;
  userHasUnliked?: boolean;
  views?: number;
}

// Request types
export interface CreateArticleRequest {
  title: string;
  content: string;
  slug: string;
  thumbnail?: string;
  categoryId: string;
  published?: boolean;
}

export interface UpdateArticleRequest {
  id: string;
  title?: string;
  content?: string;
  slug?: string;
  thumbnail?: string;
  categoryId?: string;
  published?: boolean;
}

export interface ArticleQueryParams {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: 'all' | 'published' | 'draft';
  categoryId?: string;
  authorId?: string;
  publishedOnly?: string;
}

export interface ReactionRequest {
  action: 'like' | 'unlike' | 'dislike';
}

// Response types
export interface ArticleResponse {
  article: Article;
}

export interface ArticleListResponse {
  articles: Article[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateArticleResponse {
  message: string;
  article: Article;
}

export interface UpdateArticleResponse {
  message: string;
  article: Article;
}

export interface DeleteArticleResponse {
  message: string;
}

export interface ReactionResponse {
  message: string;
  article: Article;
}
