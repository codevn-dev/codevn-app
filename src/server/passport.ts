import { FastifyInstance } from 'fastify';
import { config } from '@/config';
import { userRepository } from '@/lib/database/repository';
import bcrypt from 'bcryptjs';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import fastifyPassport from '@fastify/passport';

export async function setupPassport(fastify: FastifyInstance) {
  await fastify.register(fastifyPassport.initialize());

  // Local strategy
  fastifyPassport.use(
    'local',
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          if (!email || !password) {
            return done(null, false, { message: 'Email and password are required' });
          }

          const user = await userRepository.findByEmail(email);
          if (!user) {
            return done(null, false, { message: 'Invalid credentials' });
          }

          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) {
            return done(null, false, { message: 'Invalid credentials' });
          }

          return done(null, {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar || undefined,
            role: user.role,
          });
        } catch (error) {
          console.error('[AUTH] Local strategy error:', error);
          return done(error, false);
        }
      }
    )
  );

  // Google strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    fastifyPassport.use(
      'google',
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${config.auth.url}/api/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            const name = profile.displayName;
            const avatar = profile.photos?.[0]?.value;

            if (!email) {
              return done(null, false, { message: 'No email found in Google profile' });
            }

            // Check if user exists
            let user = await userRepository.findByEmail(email);

            if (!user) {
              // Create new user
              const newUser = await userRepository.create({
                email,
                name: name || email.split('@')[0],
                password: '', // No password for OAuth users
                role: 'user',
              });
              user = newUser[0];

              if (avatar) {
                await userRepository.update(user.id, { avatar });
              }
            } else if (avatar && !user.avatar) {
              await userRepository.update(user.id, { avatar });
            }

            return done(null, {
              id: user.id,
              email: user.email,
              name: user.name,
              avatar: user.avatar || undefined,
              role: user.role,
            });
          } catch (error) {
            console.error('[AUTH] Google strategy error:', error);
            return done(error, false);
          }
        }
      )
    );
  }
}
