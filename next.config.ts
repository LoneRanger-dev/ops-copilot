import type { NextConfig } from 'next';

/**
 * Security headers applied to every response (MASTER_BUILD_SPEC section 23.1).
 * A full Content-Security-Policy is added in Phase 11, once every script and
 * style source in the application is known.
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Required by the multi-stage Dockerfile.
  output: 'standalone',

  typedRoutes: true,

  // Native Node modules must not be bundled into the server build.
  serverExternalPackages: ['pg', 'ioredis'],

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
