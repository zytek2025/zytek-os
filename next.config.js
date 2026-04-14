/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  serverExternalPackages: ['bcryptjs'],
  
  async headers() {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:*",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join('; ')

    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options',              value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options',       value: 'nosniff' },
        { key: 'X-Download-Options',            value: 'noopen' },
        { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
        { key: 'Referrer-Policy',               value: 'strict-origin-when-cross-origin' },
        { key: 'X-XSS-Protection',             value: '1; mode=block' },
        { key: 'Permissions-Policy',            value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        { key: 'Content-Security-Policy',       value: cspDirectives },
        { key: 'Strict-Transport-Security',    value: 'max-age=31536000; includeSubDomains; preload' },
      ],
    }]
  },

  async rewrites() {
    return []
  },
}

module.exports = nextConfig
