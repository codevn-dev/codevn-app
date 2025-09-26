// Reaction types

// Repository types for reactions
export interface ReactionRow {
  id?: string;
  articleId?: string | null;
  commentId?: string | null;
  userId: string;
  type: 'like' | 'unlike';
  createdAt?: Date;
}

// Request types
export interface ReactionRequest {
  action: 'like' | 'unlike' | 'dislike';
}

// Response types
export interface ReactionResponse {
  message: string;
  hasLiked: boolean;
  hasUnliked: boolean;
  likeCount: number;
  unlikeCount: number;
}
