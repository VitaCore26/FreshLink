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

  // ── En-têtes de sécurité globaux (faille #6) ──────────────────────────────
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://placehold.co https://*.supabase.co https://*.tile.openstreetmap.org https://unpkg.com https://vitafresh.vercel.app https://vita-fresh.co.site",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; ')
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },
}

module.exports = nextConfig
