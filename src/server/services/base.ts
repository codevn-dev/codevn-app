import { logger } from '@/lib/utils/logger';

/**
 * Base service class that provides common functionality for all services
 */
export abstract class BaseService {
  protected logger = logger;

  /**
   * Handle service errors with consistent logging
   */
  protected handleError(error: unknown, context: string): never {
    this.logger.error(`${context} error`, undefined, error as Error);
    throw error;
  }

  /**
   * Validate required fields
   */
  protected validateRequiredFields(data: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter((field) => !data[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Validate ownership - user can only access their own resources unless they're admin
   */
  protected validateOwnership(user: any, resourceUserId: string): void {
    if (user.id !== resourceUserId && user.role !== 'admin') {
      throw new Error('You can only access your own resources');
    }
  }

  /**
   * Check if user is admin
   */
  protected isAdmin(user: any): boolean {
    return user?.role === 'admin';
  }
}
