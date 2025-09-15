import { UserRepository } from './user-repository';

/**
 * User repository without caching - just an alias to the base repository
 * Maintained for backward compatibility after Redis removal
 */
export class CachedUserRepository extends UserRepository {
  // All methods now just call the parent implementation without caching
  // This maintains API compatibility while removing Redis dependencies
}

// Export singleton instance
export const cachedUserRepository = new CachedUserRepository();
