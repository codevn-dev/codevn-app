import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types/auth';
import { useFastifyAuthStore } from '@/stores';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useFastifyAuth() {
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

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
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

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, name, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();
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
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
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

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setState({
          user: data.user,
          loading: false,
          error: null,
        });
      } else {
        setUser(null);
        setState({
          user: null,
          loading: false,
          error: null,
        });
      }
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
      const response = await fetch(`${API_BASE_URL}/api/auth/check-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Email check failed');
      }

      return await response.json();
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
