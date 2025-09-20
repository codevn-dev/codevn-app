import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { userRepository } from '../database/repository';
import bcrypt from 'bcryptjs';
import { authConfig, jwtConfig } from '@/config';

function generateRandomHexString(byteLength: number): string {
  const array = new Uint8Array(byteLength);
  // Use Web Crypto API (available in Edge/Browser and Node 19+ with global crypto)
  globalThis.crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authConfig.secret,
  providers: [
    CredentialsProvider({
      name: authConfig.providers.credentials.name,
      credentials: authConfig.providers.credentials.credentials,
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const user = await userRepository.findByEmail(credentials.email as string);

          if (!user) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar || undefined,
            role: user.role,
          } as any;
        } catch (error) {
          console.error('[AUTH] Authorization error:', error);
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: jwtConfig.maxAge,
  },
  jwt: {
    maxAge: jwtConfig.maxAge,
  },
  callbacks: {
    async jwt({ token, user, trigger, account }) {
      // On initial sign-in, ensure token reflects our DB user
      if (user) {
        try {
          if (account?.provider === 'google') {
            const email = user.email as string | undefined;
            const name = (user.name as string | undefined) || 'User';

            if (!email) {
              // Without email we cannot link; keep token as-is
              return token;
            }

            let dbUser = await userRepository.findByEmail(email);
            if (!dbUser) {
              // Create a user with a random strong password (not used for OAuth)
              const randomPassword = generateRandomHexString(32);
              const [created] = await userRepository.create({
                email,
                name,
                password: randomPassword,
              });
              dbUser = created;
            }

            if (dbUser) {
              token.sub = dbUser.id;
              token.role = dbUser.role;
              token.avatar = dbUser.avatar;
              token.name = dbUser.name;
              token.email = dbUser.email;
              token.lastUpdated = Date.now();
            }
          } else {
            // Credentials flow already supplies our fields on user
            token.role = (user as any).role;
            token.avatar = (user as any).avatar;
            token.name = user.name as string | undefined;
            token.email = user.email as string | undefined;
            token.lastUpdated = Date.now();
          }
        } catch (e) {
          console.error('[AUTH] jwt user handling error:', e);
        }
      }

      // If session is being updated, refresh user data from database
      if (trigger === 'update' && token.sub) {
        try {
          const user = await userRepository.findById(token.sub);

          if (user) {
            token.role = user.role;
            token.avatar = user.avatar;
            token.name = user.name;
            token.email = user.email;
            token.lastUpdated = Date.now();
          }
        } catch {
          // Error handled silently
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.sub) {
        try {
          const user = await userRepository.findById(token.sub);

          if (user) {
            (session.user as any).id = user.id;
            (session.user as any).role = user.role;
            (session.user as any).avatar = user.avatar || '';
            session.user.name = user.name;
            session.user.email = user.email;
          }
        } catch {
          (session.user as any).id = token.sub;
          (session.user as any).role = (token.role as 'user' | 'admin') || 'user';
          (session.user as any).avatar = (token.avatar as string) || '';
          session.user.name = (token.name as string) || '';
          session.user.email = (token.email as string) || '';
        }
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      // If it's a relative URL, make it absolute
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // If it's the same origin, allow it
      if (new URL(url).origin === baseUrl) return url;
      // Otherwise, redirect to home
      return baseUrl;
    },
  },
  pages: {
    signIn: '/',
  },
});
