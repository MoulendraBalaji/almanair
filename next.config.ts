import type { NextConfig } from 'next';

/** Next configuration: no remote image/API origins; the app is self-contained. */
const nextConfig: NextConfig = {
  turbopack: { root: import.meta.dirname },
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
