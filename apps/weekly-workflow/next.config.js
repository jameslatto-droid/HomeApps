/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    }
  },
  // Optimize performance
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Reduce build size
  productionBrowserSourceMaps: false,
  // Optimize images
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
};

module.exports = nextConfig;
