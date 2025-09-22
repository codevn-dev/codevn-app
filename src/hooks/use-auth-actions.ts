import { useState, useCallback } from 'react';
import {
  AuthState,
  LoginResponse,
  RegisterResponse,
  CheckEmailResponse,
} from '@/types/shared/auth';
import { useFastifyAuthStore } from '@/stores';
import { apiPost, apiGet } from '@/lib/utils';
import { UserResponse } from '@/types/shared';

export function useAuthActions() {
  const { user, setUser, setLoading } = useFastifyAuthStore();
  const [state, setState] = useState<AuthState>({
    user: user || null,
    isLoading: true,
    isAuthenticated: false,
  });

  const signIn = async (email: string, password: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      setLoading(true);

      const data = await apiPost<LoginResponse>('/api/auth/sign-in', { email, password });
      setUser(data.user);
      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: true,
      });

      return data;
    } catch (error) {
      const _errorMessage = error instanceof Error ? error.message : 'Login failed';
      setState((prev: AuthState) => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
      }));
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, name: string, password: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      setLoading(true);

      const data = await apiPost<RegisterResponse>('/api/auth/sign-up', { email, name, password });
      setUser(data.user);
      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: true,
      });

      return data;
    } catch (error) {
      setState((prev: AuthState) => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
      }));
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await apiPost('/api/auth/sign-out', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const checkAuth = useCallback(async () => {
    try {
      setState((prev: AuthState) => ({ ...prev, isLoading: true }));
      setLoading(true);

      const data = await apiGet<UserResponse>('/api/auth/me');
      setUser(data.user);
      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      setUser(null);
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading, setState]);

  const checkEmail = async (email: string) => {
    try {
      return await apiPost<CheckEmailResponse>('/api/auth/check-email', { email });
    } catch (error) {
      const _errorMessage = error instanceof Error ? error.message : 'Email check failed';
      throw new Error(_errorMessage);
    }
  };

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    checkAuth,
    checkEmail,
  };
}
