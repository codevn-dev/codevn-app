import { User } from './auth';
import { UserRole } from './roles';

// Request types
export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  avatar?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateUserRoleRequest {
  userId: string;
  role: UserRole;
}

// Response types
export interface UserProfileResponse {
  user: User;
}

export interface UpdateProfileResponse {
  message: string;
  user: User;
}

export interface ChangePasswordResponse {
  message: string;
}

// Extended user types for different contexts
export interface UserWithStats extends User {
  _count: {
    articles: number;
    comments: number;
    likes: number;
  };
}

export interface UserListResponse {
  users: UserWithStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Single user response
export interface UserResponse {
  user: User;
}

// Leaderboard types
export interface LeaderboardStats {
  posts: number;
  likes: number;
  dislikes: number;
  comments: number;
  views: number;
  score: number;
}

export interface LeaderboardEntry {
  user: User;
  stats: LeaderboardStats;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

// Repository types for users
export interface UserFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  role?: UserRole;
}

export interface PaginatedUsers {
  users: Array<{
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: UserRole;
    createdAt: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
