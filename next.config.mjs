/** @type {import('next').NextConfig} */
const nextConfig = {
    // 1. Force Vercel to bundle the WASM file
    experimental: {
        serverComponentsExternalPackages: ['@kaspa/core-lib', 'secp256k1'],
        outputFileTracingIncludes: {
            '/api/**/*': ['./node_modules/**/*.wasm', './node_modules/**/*.proto'],
        },
    },

    // 2. Configure Webpack to handle WASM
    webpack: (config, { isServer }) => {
        config.experiments = {
            ...config.experiments,
            asyncWebAssembly: true,
            layers: true,
        };

        // Fix for missing 'fs' in client-side bundles (just in case)
        if (!isServer) {
            config.resolve.fallback = { ...config.resolve.fallback, fs: false };
        }

        return config;
    },
};

export default nextConfig;

