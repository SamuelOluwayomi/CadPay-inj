/** @type {import('next').NextConfig} */
const nextConfig = {
    // ---------------------------------------------------------
    // 🚨 FIX 1: EXTERNALIZE KASPA
    // This tells Next.js: "Do not try to bundle this file. 
    // Just let Node.js require it at runtime."
    // This fixes "Module not found" and "WASM" errors.
    // ---------------------------------------------------------
    serverExternalPackages: ['kaspa'],

    // ---------------------------------------------------------
    // 🚨 FIX 2: WEBPACK WASM SUPPORT
    // In case Webpack still tries to peek inside, we enable WASM.
    // ---------------------------------------------------------
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
