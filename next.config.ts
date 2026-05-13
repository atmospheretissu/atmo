import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // The proxy (formerly middleware) handles auth flows; disable URL
  // normalization at the proxy boundary so Supabase OAuth callback paths
  // are preserved exactly.
  skipProxyUrlNormalize: true,
};

export default nextConfig;
