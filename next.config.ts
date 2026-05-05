import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "fastly.picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "images.pexels.com", pathname: "/**" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "*.cdninstagram.com", pathname: "/**" },
      { protocol: "https", hostname: "lookaside.instagram.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.dsmcdn.com", pathname: "/**" }
    ]
  }
};

export default nextConfig;
