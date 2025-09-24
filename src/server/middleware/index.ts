export { authMiddleware, optionalAuthMiddleware, type AuthenticatedRequest } from './auth';
export { verifyToken, generateToken, type JWTPayload } from './jwt';
export { setupPassport } from './passport';
export {
  RedisRateLimit,
  createRateLimit,
  rateLimitPlugin,
  type RateLimitOptions,
} from './rate-limit';
