const config = {
  plugins: [
    '@tailwindcss/postcss',
    // Minify CSS in production
    ...(process.env.NODE_ENV === 'production' ? ['cssnano'] : []),
  ],
};

export default config;
