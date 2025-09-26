export interface Comment {
  id: string;
  content: string;
  articleId: string;
  parentId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string | null;
  author: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  replies?: Comment[];
  replyCount?: number;
  _count: {
    replies: number;
    likes: number;
  };
  likeCount?: number;
  unlikeCount?: number;
  userHasLiked?: boolean;
  userHasUnliked?: boolean;
  parent?: {
    id: string;
    content: string;
    author: {
      id: string;
      name: string;
    };
  };
}

// Request types
export interface CreateCommentRequest {
  content: string;
  parentId?: string;
}

export interface UpdateCommentRequest {
  id: string;
  content: string;
}

export interface CommentQueryParams {
  sortOrder?: 'asc' | 'desc';
  page?: string;
  limit?: string;
  parentId?: string;
}

// Response types
export interface CommentResponse {
  comment: Comment;
}

export interface CommentListResponse {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateCommentResponse {
  message: string;
  comment: Comment;
}

export interface UpdateCommentResponse {
  message: string;
  comment: Comment;
}

export interface DeleteCommentResponse {
  message: string;
}

// Repository types for comments
export interface CommentFilters {
  articleId?: string;
  parentId?: string | null;
  authorId?: string;
  sortBy?: 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  userId?: string; // For checking user like/unlike status
}

export interface PaginatedComments {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
