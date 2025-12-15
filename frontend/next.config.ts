import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone for better performance
  output: 'standalone',
  
  // TypeScript and ESLint errors won't block production builds
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
