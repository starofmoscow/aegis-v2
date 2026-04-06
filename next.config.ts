import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ['canvas'],
  experimental: {
    serverActions: { bodySizeLimit: '50mb' },
  },
};

export default nextConfig;
