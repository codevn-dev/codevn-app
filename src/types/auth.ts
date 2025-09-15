import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'user' | 'admin';
      avatar?: string;
    } & DefaultSession['user'];
  }

  interface User {
    role: 'user' | 'admin';
    avatar?: string;
  }
}

// JWT types are handled in the auth configuration
