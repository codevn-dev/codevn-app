# Zustand State Management

This project uses Zustand for global state management. Zustand is a lightweight and simple state management library for React.

## Store Structure

### 1. Auth Store (`auth-store.ts`)

Manages authentication state:

- `user`: Current user information
- `isAuthenticated`: Login status
- `isLoading`: Loading state
- `setUser()`: Update user information
- `logout()`: Logout user
- `updateUser()`: Update user information

### 2. UI Store (`ui-store.ts`)

Manages interface state:

- `authModalOpen`: Login/register modal state
- `authMode`: Modal mode (signin/signup)
- `globalLoading`: Global loading state
- `notifications`: Notification list
- `setAuthModalOpen()`: Open/close modal
- `addNotification()`: Add notification
- `removeNotification()`: Remove notification

### 3. Forum Store (`forum-store.ts`)

Manages community data:

- `articles`: Article list
- `searchTerm`: Search keyword
- `isLoading`: Loading state
- `error`: Error state
- `setArticles()`: Update article list
- `setSearchTerm()`: Update search keyword

## Usage

### Import stores

```typescript
import { useAuthStore, useUIStore, useForumStore } from '@/stores';
```

### Use in components

```typescript
function MyComponent() {
  const { user, isAuthenticated } = useAuthStore();
  const { authModalOpen, setAuthModalOpen } = useUIStore();
  const { articles, setArticles } = useForumStore();

  // Use state and actions
}
```

### Persist data

Auth store is automatically persisted with localStorage to maintain login state.

## Benefits

1. **Simple**: Easy-to-understand and use API
2. **Lightweight**: Small size, doesn't impact performance
3. **TypeScript**: Excellent TypeScript support
4. **Persist**: Automatically saves state to localStorage
5. **DevTools**: Supports Redux DevTools for debugging

## Best Practices

1. **Separate concerns**: Each store manages a specific domain
2. **Immutable updates**: Always create new objects when updating state
3. **Selective subscriptions**: Only subscribe to necessary state
4. **Type safety**: Use TypeScript interfaces for type safety
