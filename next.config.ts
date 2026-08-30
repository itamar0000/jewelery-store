import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  typescript: {
    // Type errors must fail the production build. Never set this to true.
    ignoreBuildErrors: false,
  },
  eslint: {
    // Linting runs as its own `npm run lint` step (and in CI); `next build`
    // does not need to repeat it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
