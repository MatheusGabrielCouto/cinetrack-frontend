import type { NextConfig } from 'next'

const rawApiUrl = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '')

const isAbsoluteHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const apiUrl = isAbsoluteHttpUrl(rawApiUrl)
  ? rawApiUrl
  : process.env.VERCEL
    ? ''
    : 'http://localhost:3000'

if (process.env.VERCEL && !apiUrl) {
  console.warn(
    '[next.config] Set NEXT_PUBLIC_API_URL to your Railway API URL (https://…). Storage proxy rewrite was skipped.',
  )
}

const nextConfig: NextConfig = {
  async rewrites() {
    if (!apiUrl) return []

    return [
      {
        source: '/storage/:path*',
        destination: `${apiUrl}/storage/:path*`,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
    ],
  },
}

export default nextConfig
