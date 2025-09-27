import { UserRole } from './roles';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  statistics?: {
    totalArticles: number;
    totalLikes: number;
    totalDislikes: number;
    totalComments: number;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Request types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface CheckEmailRequest {
  email: string;
}

// Response types
export interface LoginResponse {
  message: string;
  user: User;
  token?: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface CheckEmailResponse {
  available: boolean;
  message: string;
}

// Shared auth token/session types
export interface SessionMetadata {
  country?: {
    code: string;
    name: {
      en: string;
      vi: string;
    };
  };
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
  };
  loginTime: string;
  lastActive?: string;
}

export type SessionInterface = SessionMetadata & {
  token: string;
  isCurrent: boolean;
};

export interface JWTPayload {
  id: string;
  role: UserRole;
  sessionMetadata?: SessionMetadata;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  id: string;
  sessionMetadata?: SessionMetadata;
  iat?: number;
  exp?: number;
}

// System user management types
export interface CreateSystemUserRequest {
  name: string;
  email: string; // Email required for system users (for future email features)
  avatar?: string;
}

export interface UpdateSystemUserRequest {
  name?: string;
  email?: string; // Allow updating email
  avatar?: string;
}

export interface SystemUserResponse {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  createdAt: string;
}
