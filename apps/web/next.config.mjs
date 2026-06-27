/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@facin/ui'],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', '@prisma/engines'],
    outputFileTracingIncludes: {
      '/**/*': ['../../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/**'],
    },
  },
}

export default nextConfig
