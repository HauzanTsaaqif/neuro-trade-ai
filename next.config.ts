import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Allow CoinGecko API calls from server-side routes
  serverExternalPackages: ['@anthropic-ai/sdk'],
};

export default nextConfig;
