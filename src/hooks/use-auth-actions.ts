import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types/auth';
import { useFastifyAuthStore } from '@/stores';
import { apiPost, apiGet } from '@/lib/utils';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuthActions() {
  const { user, setUser, setLoading } = useFastifyAuthStore();
  const [state, setState] = useState<AuthState>({
    user,
    loading: true,
    error: null,
  });

  const login = async (email: string, password: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      setLoading(true);

      const data = await apiPost('/api/auth/sign-in', { email, password });
      setUser(data.user);
      setState({
        user: data.user,
        loading: false,
        error: null,
      });

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      setLoading(false);
      throw error;
    }
  };

  const register = async (email: string, name: string, password: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      setLoading(true);

      const data = await apiPost('/api/auth/sign-up', { email, name, password });
      setUser(data.user);
      setState({
        user: data.user,
        loading: false,
        error: null,
      });

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
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
        loading: false,
        error: null,
      });
    }
  };

  const checkAuth = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      setLoading(true);

      const data = await apiGet('/api/auth/me');
      setUser(data.user);
      setState({
        user: data.user,
        loading: false,
        error: null,
      });
    } catch {
      setUser(null);
      setState({
        user: null,
        loading: false,
        error: null,
      });
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading, setState]);

  const checkEmail = async (email: string) => {
    try {
      return await apiPost('/api/auth/check-email', { email });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Email check failed';
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...state,
    login,
    register,
    logout,
    checkAuth,
    checkEmail,
  };
}
