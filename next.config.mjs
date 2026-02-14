/** @type {import('next').NextConfig} */
const nextConfig = {
    // 1. Tell Next.js 15+ to treat this as external
    serverExternalPackages: ['kaspa'],

    // 2. FORCE copy the files (The Nuclear Option)
    experimental: {
        // Duplicate for safety on Vercel's builder
        serverComponentsExternalPackages: ['kaspa'],
        outputFileTracingIncludes: {
            '/api/**/*': ['./node_modules/kaspa/**/*'],
        },
    },

    // 3. Webpack config
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
