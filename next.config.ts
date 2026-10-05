import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/proxy/fit/:path*',
        destination: 'https://nodeapi.smartdietplanner.com/:path*',
      },
      {
        source: '/proxy/bon/:path*',
        destination: 'https://api.bonhappetee.com/:path*',
      },
    ];
  },
};

export default nextConfig;
