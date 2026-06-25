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
    serverComponentsExternalPackages: ['@clerk/nextjs'],
  },
};

export default nextConfig;
