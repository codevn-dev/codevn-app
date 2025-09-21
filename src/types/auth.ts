// Re-export shared auth types for backward compatibility
export type {
  User,
  AuthState,
  LoginRequest as LoginCredentials,
  RegisterRequest as RegisterCredentials,
} from './shared/auth';
