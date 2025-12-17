/** @type {import('next').NextConfig} */
const nextConfig = {
  // PRODUCTION BUILD: Standard SSR with dynamic pages
  // DO NOT use output: 'export' - breaks auth context

  reactStrictMode: true,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    domains: [
      'i.imgur.com',
      'imagedelivery.net',
      'res.cloudinary.com',
      'warpcast.com',
      'api.dicebear.com',
    ],
    unoptimized: false,
  },

  // Webpack config for Web3/wallet compatibility
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
    };

    // Handle MetaMask SDK's react-native dependency warning
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@react-native-async-storage/async-storage': false,
      };
    }

    // Suppress known warnings from WalletConnect/Pino
    config.ignoreWarnings = [
      { module: /node_modules\/pino\/lib\/tools\.js/ },
      { module: /node_modules\/@metamask\/sdk/ },
      /Critical dependency: the request of a dependency is an expression/,
    ];

    return config;
  },

  // TypeScript & ESLint
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.24hrmvp.xyz',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'wss://api.24hrmvp.xyz',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://24hrmvp.xyz',
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },

  // Experimental features
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '24hrmvp.xyz', 'api.24hrmvp.xyz'],
    },
  },

  // Production optimizations
  swcMinify: true,
  poweredByHeader: false,
  compress: true,

  // Logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

module.exports = nextConfig;
