import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // The proxy (formerly middleware) handles auth flows; disable URL
  // normalization at the proxy boundary so Supabase OAuth callback paths
  // are preserved exactly.
  skipProxyUrlNormalize: true,

  // Barrel-imports optimizations : lucide-react = 38 MB, chaque icône
  // traverse tout le barrel sans cette option. HMR dev accéléré nettement,
  // bundle client réduit d'autant.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;
