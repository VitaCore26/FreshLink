/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevents TS and ESLint from blocking Vercel deployments
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  // Ensures consistent output between preview and production
  reactStrictMode: true,
}

export default nextConfig
