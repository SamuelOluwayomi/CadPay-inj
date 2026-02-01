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
    }
};

export default nextConfig;
