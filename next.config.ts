import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // TODO: replace with your actual image domains (CDN/storage)
    domains: ['localhost', '127.0.0.1'],
    formats: ['image/avif', 'image/webp'],
  },
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
    // Enable SWC minification for better performance
    styledComponents: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // Enable modern JavaScript for better performance
    esmExternals: true,
    // Optimize CSS imports - temporarily disabled due to critters module issue
    // optimizeCss: true,
  },
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
      // Any file .svg import will use SVGR to become a React component
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
