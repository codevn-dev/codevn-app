import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  async rewrites() {
    // Only use rewrites in development for API proxy
    // In production, API client handles URL resolution automatically
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (isDevelopment) {
      // Use localhost for development (both local and Docker)
      // Docker containers can access localhost through host.docker.internal
      const apiUrl = process.env.API_URL || 'http://localhost:3001';
      const destination = apiUrl.includes('api:')
        ? 'http://localhost:3001' // Fallback to localhost for Docker
        : apiUrl;

      return [
        {
          source: '/api/:path*',
          destination: `${destination}/api/:path*`,
        },
      ];
    }

    // In production, no rewrites needed
    return [];
  },
};

export default nextConfig;
