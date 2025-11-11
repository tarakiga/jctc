/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignore TypeScript errors during development
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore ESLint errors during development
    ignoreDuringBuilds: true,
  },
  // Disable webpack cache to avoid workspace issues
  webpack: (config) => {
    config.cache = false
    return config
  },
}

module.exports = nextConfig
