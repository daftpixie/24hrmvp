/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['imagedelivery.net', 'i.imgur.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.farcaster.xyz',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: '/api/farcaster-manifest',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
