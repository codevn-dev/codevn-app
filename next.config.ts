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
  // SWC minification is enabled by default in Next.js 13+
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-dialog', 
      '@radix-ui/react-dropdown-menu', 
      '@radix-ui/react-select',
      '@radix-ui/react-avatar',
      '@radix-ui/react-label',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-text-align',
      '@tiptap/extension-underline',
      '@tiptap/extension-link',
      '@tiptap/extension-text-style',
      '@tiptap/extension-color',
      '@tiptap/extension-code-block-lowlight',
      '@tiptap/extension-image',
      '@tiptap/core',
      'highlight.js',
      'lowlight',
      'framer-motion',
      'zustand',
      'clsx',
      'tailwind-merge',
      'class-variance-authority'
    ],
    // Enable modern JavaScript for better performance
    esmExternals: true,
    // Optimize CSS imports - disabled for Turbopack compatibility
    // optimizeCss: true,
    // Enable webpack build worker for faster builds
    webpackBuildWorker: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/articles/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=180, stale-while-revalidate=3600',
          },
        ],
      },
    ];
  },
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
