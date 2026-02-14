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

    // Inject env vars to force Pure JS in @kaspa/core-lib
    env: {
        ECCLIB_JS: '1',
        ECCSI_JS: '1',
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

        // 1. Force Webpack to handle WASM files
        config.experiments = {
            ...config.experiments,
            asyncWebAssembly: true,
            layers: true,
        };

        // 2. Fix for "fs" module not found errors (common in crypto libs)
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
            };
        }

        return config;
    },
};

export default nextConfig;

