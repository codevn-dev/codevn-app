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
    // In production with nginx, nginx handles the API proxying
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

    // In production with nginx, no rewrites needed
    // nginx handles /api/* → api:3001 and /* → web:3000
    return [];
  },
  turbopack: {
    rules: {
      // Bất kỳ file .svg import sẽ dùng SVGR để thành React component
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
