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
      '/**/*': ['./node_modules/.prisma/client/**', './node_modules/@prisma/client/**'],
    },
  },
}

export default nextConfig
