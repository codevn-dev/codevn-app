export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
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
  countryCode?: string;
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
  role: 'user' | 'admin';
  sessionMetadata?: SessionMetadata;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  id: string;
  iat?: number;
  exp?: number;
}
