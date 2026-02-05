import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:8888', '127.0.0.1:8888']
    }
  }
};

export default nextConfig;
