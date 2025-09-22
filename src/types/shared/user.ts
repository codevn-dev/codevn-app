import { User } from './auth';

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
  role: 'user' | 'admin';
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
