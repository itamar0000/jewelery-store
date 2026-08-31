import type { NextConfig } from 'next';

/**
 * Remote image hosts.
 *
 * `next/image` refuses to optimise a remote URL unless its host is allow-listed
 * here, which is the point - without it, any URL that reached a component could
 * be proxied through the image optimizer.
 *
 * The pattern is DERIVED FROM THE CONFIGURED MEDIA HOST rather than hard-coded,
 * so the same build works against MinIO locally and R2 in production, and a
 * deployment that has not configured storage allow-lists nothing at all.
 *
 * Media storage is optional (docs/MEDIA_STORAGE_DECISION.md): with no
 * `MEDIA_PUBLIC_BASE_URL` the storefront falls back to the placeholder surface,
 * so an empty list is the correct outcome, not a misconfiguration.
 */
function mediaRemotePatterns(): NonNullable<NextConfig['images']>['remotePatterns'] {
  const base = process.env.MEDIA_PUBLIC_BASE_URL?.trim();
  if (!base) return [];

  try {
    const url = new URL(base);

    return [
      {
        protocol: url.protocol.replace(':', '') as 'http' | 'https',
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
        // Scoped to the configured path, so allow-listing the host does not
        // also allow every other object served from it.
        pathname: `${url.pathname.replace(/\/+$/, '')}/**`,
      },
    ];
  } catch {
    // A malformed URL is a configuration mistake, but failing the build here
    // would be a confusing place to surface it - `readS3ConfigFromEnv` reports
    // it legibly at the point of use instead.
    return [];
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    remotePatterns: mediaRemotePatterns(),

    /**
     * Modern formats, in preference order. `next/image` negotiates by `Accept`,
     * so a browser that supports neither still receives the original.
     *
     * This is the whole transformation strategy: one stored object per image,
     * with responsive widths and modern formats derived at request time. No
     * physical derivative files are created, which is what keeps deletion and
     * re-upload simple (docs/MEDIA_STORAGE_DECISION.md).
     */
    formats: ['image/avif', 'image/webp'],
  },

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
