/** @type {import('next').NextConfig} */
const nextConfig = {
    // Disable caching in development to prevent ERR_CACHE_OPERATION_NOT_SUPPORTED
    experimental: {
        workerThreads: false,
        cpus: 1
    },
    // Disable static page generation cache
    generateBuildId: async () => {
        return 'build-' + Date.now()
    },

    // Webpack configuration to handle Kaspa WASM
    webpack: (config, { isServer }) => {
        // Ignore require() calls in kaspa.js (WASM bindings)
        config.module.rules.push({
            test: /kaspa\.js$/,
            parser: {
                amd: false, // Disables AMD
                commonjs: false, // Disables CommonJS (ignores 'require')
            },
        });

        // Handle WASM files
        config.experiments = {
            ...config.experiments,
            asyncWebAssembly: true,
            layers: true,
        };

        return config;
    },
};

export default nextConfig;

