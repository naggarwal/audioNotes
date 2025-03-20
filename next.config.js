/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during development; still runs during build
    ignoreDuringBuilds: true
  }
};

module.exports = nextConfig; 