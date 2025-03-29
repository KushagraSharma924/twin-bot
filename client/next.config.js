/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Add any specific configuration needed for Vercel deployment
  output: 'standalone',
  // Ensure proper environment variable handling
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
  }
};

module.exports = nextConfig; 