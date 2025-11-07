import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack disabled for production builds (Netlify compatibility)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Output standalone for better performance
  output: 'standalone',
};

export default nextConfig;
