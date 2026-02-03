import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Fix the "Can't resolve 'fs'" and dynamic require errors for browser builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        os: false,
        net: false,
        tls: false,
        zlib: false,
        url: false,
        assert: false,
        module: false,
      };
    }

    return config;
  },
};

export default nextConfig;
