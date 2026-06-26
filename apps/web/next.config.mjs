/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["@facin/ui", "@facin/db"],
  experimental: {
    outputFileTracingRoot: '../../',
  },
};

export default nextConfig;
