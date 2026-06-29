import type { NextConfig } from "next";
import path from "node:path";

const emptyPolyfill = "./src/lib/empty-polyfill.js";
const emptyPolyfillAbs = path.join(process.cwd(), "src/lib/empty-polyfill.js");

function supabaseStorageRemotePattern(): { protocol: "https"; hostname: string; pathname: string } {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (raw) {
    try {
      return {
        protocol: "https",
        hostname: new URL(raw).hostname,
        pathname: "/storage/v1/object/public/**",
      };
    } catch {
      /* fall through */
    }
  }
  return {
    protocol: "https",
    hostname: "*.supabase.co",
    pathname: "/storage/v1/object/public/**",
  };
}

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/favicon.ico", destination: "/icon-96.png", permanent: true },
    ];
  },
  experimental: {
    inlineCss: true,
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  turbopack: {
    resolveAlias: {
      "../build/polyfills/polyfill-module": emptyPolyfill,
      "next/dist/build/polyfills/polyfill-module": emptyPolyfill,
    },
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "../build/polyfills/polyfill-module": emptyPolyfillAbs,
        "next/dist/build/polyfills/polyfill-module": emptyPolyfillAbs,
      };
    }
    return config;
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "fastly.picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "images.pexels.com", pathname: "/**" },
      supabaseStorageRemotePattern(),
      { protocol: "https", hostname: "*.cdninstagram.com", pathname: "/**" },
      { protocol: "https", hostname: "scontent.cdninstagram.com", pathname: "/**" },
      { protocol: "https", hostname: "*.fbcdn.net", pathname: "/**" },
      { protocol: "https", hostname: "*.fbsbx.com", pathname: "/**" },
      { protocol: "https", hostname: "lookaside.instagram.com", pathname: "/**" },
      { protocol: "https", hostname: "lookaside.fbsbx.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.dsmcdn.com", pathname: "/**" }
    ]
  }
};

export default nextConfig;
