/** @type {import('next').NextConfig} */
const nextConfig = {
    // 1. Externalize kaspa so Webpack doesn't mangle it
    serverExternalPackages: ['kaspa'],

    // 2. 🚨 THE FIX: Force Vercel to copy the ENTIRE kaspa folder
    // This ensures 'kaspa_wasm' and the .wasm file are present in the cloud.
    experimental: {
        outputFileTracingIncludes: {
            '/api/**/*': ['./node_modules/kaspa/**/*'],
        },
    },

    // 3. Keep standard WASM support
    webpack: (config) => {
        config.experiments = {
            ...config.experiments,
            asyncWebAssembly: true,
            layers: true,
        };
        return config;
    },
};

export default nextConfig;
