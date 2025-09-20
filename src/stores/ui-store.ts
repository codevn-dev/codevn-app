import { create } from 'zustand';

export type AuthMode = 'signin' | 'signup';

interface UIState {
  // Auth Modal
  authModalOpen: boolean;
  authMode: AuthMode;

  // Loading states
  globalLoading: boolean;

  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
    duration?: number;
    action?: {
      label?: string;
      onClick: () => void;
    };
  }>;

  // Actions
  setAuthModalOpen: (open: boolean) => void;
  setAuthMode: (mode: AuthMode) => void;
  setGlobalLoading: (loading: boolean) => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  authModalOpen: false,
  authMode: 'signin',
  globalLoading: false,
  notifications: [],

  // Actions
  setAuthModalOpen: (open) => {
    set({ authModalOpen: open });
  },

  setAuthMode: (mode) => {
    set({ authMode: mode });
  },

  setGlobalLoading: (loading) => {
    set({ globalLoading: loading });
  },

  addNotification: (notification) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = {
      ...notification,
      id,
      duration: notification.duration || 5000,
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // Auto remove notification after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, newNotification.duration);
    }
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },
}));
