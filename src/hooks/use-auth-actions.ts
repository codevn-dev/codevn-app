import { useState, useCallback } from 'react';
import { AuthState } from '@/types/shared/auth';
import { useFastifyAuthStore } from '@/stores';
import { apiPost, apiGet } from '@/lib/utils';

export function useAuthActions() {
  const { user, setUser, setLoading } = useFastifyAuthStore();
  const [state, setState] = useState<AuthState>({
    user: user || null,
    isLoading: true,
    isAuthenticated: false,
  });

  const login = async (email: string, password: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      setLoading(true);

      const data = await apiPost('/api/auth/sign-in', { email, password });
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

  const register = async (email: string, name: string, password: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      setLoading(true);

      const data = await apiPost('/api/auth/sign-up', { email, name, password });
      setUser(data.user);
      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: true,
      });

      return data;
    } catch (error) {
      const _errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setState((prev: AuthState) => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
      }));
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiGet('/api/auth/sign-out');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: true,
      });
    }
  };

  const checkAuth = useCallback(async () => {
    try {
      setState((prev: AuthState) => ({ ...prev, isLoading: true }));
      setLoading(true);

      const data = await apiGet('/api/auth/me');
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
        isAuthenticated: true,
      });
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading, setState]);

  const checkEmail = async (email: string) => {
    try {
      return await apiPost('/api/auth/check-email', { email });
    } catch (error) {
      const _errorMessage = error instanceof Error ? error.message : 'Email check failed';
      throw new Error(_errorMessage);
    }
  };

  return {
    ...state,
    login,
    register,
    logout,
    checkAuth,
    checkEmail,
  };
}
