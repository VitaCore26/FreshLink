/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ── TypeScript ────────────────────────────────────────────────────────────
  // Le build échoue désormais sur une erreur de type (0 erreur au 2026-06-15).
  // Pour débloquer un déploiement urgent en cas de régression, repasser
  // temporairement à `ignoreBuildErrors: true` puis corriger.
  typescript: { ignoreBuildErrors: false },

  // ── Images ───────────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'jwdrwapuetqoqnankgma.supabase.co' },
      { protocol: 'https', hostname: 'vitafresh.vercel.app' },
      { protocol: 'https', hostname: 'vita-fresh.co.site' },
    ],
  },

  // ── Webpack ───────────────────────────────────────────────────────────────
  webpack: (config, { isServer }) => {
    try {
      config.resolve.alias = {
        ...config.resolve.alias,
        'react-is': require.resolve('react-is'),
      }
    } catch (e) {}

    if (isServer) {
      config.externals = Array.isArray(config.externals)
        ? [...config.externals, 'leaflet']
        : ['leaflet']
    }

    // Firebase est optionnel — ignorer si non installé
    try {
      require.resolve('firebase/app')
    } catch {
      const webpack = require('webpack')
      config.plugins.push(
        new webpack.IgnorePlugin({ resourceRegExp: /^firebase/ })
      )
    }

    return config
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
}

module.exports = nextConfig
