import { CountryInfo } from '@/types/shared/country';
import { createCountryRedisService } from '../redis/country';
import { logger } from '@/lib/utils/logger';

export class CountryService {
  private static redisService = createCountryRedisService();

  /**
   * Get country information by country code
   * @param code - Country code (e.g., 'VN', 'US')
   * @returns Country info with name and dial_code
   */
  static async getByCode(code: string): Promise<CountryInfo | null> {
    try {
      return await this.redisService.getByCode(code);
    } catch (error) {
      logger.error('Failed to get country by code:', { error, code });
      return null;
    }
  }

  /**
   * Preload all countries into Redis cache
   * This can be called on server startup to warm up the cache
   */
  static async preloadCache(): Promise<void> {
    try {
      await this.redisService.preloadCache();
    } catch (error) {
      logger.error('Failed to preload country cache:', { error });
    }
  }
}

// Export singleton instance
export const countryService = new CountryService();
