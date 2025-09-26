import { getRedis } from '@/lib/server';
import { Country, CountryInfo } from '@/types/shared/country';
import { logger } from '@/lib/utils/logger';
import countryData from '../data/country_code.json';

export class CountryRedisService {
  private static readonly CACHE_PREFIX = 'country:code:';
  private static readonly CACHE_TTL = 86400; // 24 hours
  private readonly redis = getRedis();

  /**
   * Get country information by country code from Redis cache
   * @param code - Country code (e.g., 'VN', 'US')
   * @returns Country info with name and dial_code
   */
  async getByCode(code: string): Promise<CountryInfo | null> {
    try {
      const cacheKey = `${CountryRedisService.CACHE_PREFIX}${code.toUpperCase()}`;

      // Try to get from Redis cache first
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch {}

      // Fallback: Find in country data from JSON file
      const country = countryData.find((c: Country) => c.code.toUpperCase() === code.toUpperCase());

      if (!country) {
        return null;
      }

      const countryInfo: CountryInfo = {
        name: country.name,
        dial_code: country.dial_code,
      };

      // Try to cache the result (ignore if Redis fails)
      try {
        await this.redis.setex(
          cacheKey,
          CountryRedisService.CACHE_TTL,
          JSON.stringify(countryInfo)
        );
      } catch {}

      return countryInfo;
    } catch (error) {
      logger.error('Failed to get country by code:', { error, code });
      return null;
    }
  }

  /**
   * Preload all countries into Redis cache
   * This can be called on server startup to warm up the cache
   */
  async preloadCache(): Promise<void> {
    try {
      logger.info('Preloading country cache into Redis...');

      // Cache individual countries
      const promises = countryData.map(async (country: Country) => {
        const cacheKey = `${CountryRedisService.CACHE_PREFIX}${country.code}`;
        const countryInfo: CountryInfo = {
          name: country.name,
          dial_code: country.dial_code,
        };

        try {
          return await this.redis.setex(
            cacheKey,
            CountryRedisService.CACHE_TTL,
            JSON.stringify(countryInfo)
          );
        } catch (redisError) {
          logger.warn(`Failed to cache country ${country.code}, but continuing:`, {
            error: redisError,
          });
          return null;
        }
      });

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(
        (result) => result.status === 'fulfilled' && result.value !== null
      ).length;

      logger.info(`Preloaded ${successCount}/${countryData.length} countries into Redis cache`);
    } catch (error) {
      logger.error('Failed to preload country cache into Redis:', { error });
    }
  }
}

// Factory function to create CountryRedisService instance
export function createCountryRedisService(): CountryRedisService {
  return new CountryRedisService();
}
