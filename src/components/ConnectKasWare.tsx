'use client';

import { useKasWare } from '@/hooks/useKasWare';
import { useRouter } from 'next/navigation';

export default function ConnectKasWare() {
    const { connect, isConnected, isLoading, error, isAvailable } = useKasWare();
    const router = useRouter();

    const handleConnect = async () => {
        if (!isAvailable) {
            window.open('https://www.kasware.xyz/', '_blank');
            return;
        }
        const addr = await connect();
        if (addr) {
            // Successfully connected!
            console.log("Logged in as:", addr);
            // Redirect to dashboard
            router.push('/dashboard');
        }
    };

    return (
        <div className="flex flex-col gap-3 w-full">
            <button
                onClick={handleConnect}
                disabled={isLoading || isConnected}
                className="group relative flex items-center justify-center gap-3 p-4 w-full rounded-xl border border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 hover:border-orange-500/50 transition-all disabled:opacity-50"
            >
                {/* KasWare Icon Placeholder */}
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-orange-900/20">
                    KW
                </div>

                <div className="flex flex-col items-start">
                    <span className="font-bold text-white text-lg">
                        {!isAvailable ? "Install KasWare" : isLoading ? "Connecting..." : isConnected ? "Connected" : "Connect KasWare"}
                    </span>
                    <span className="text-xs text-zinc-400 group-hover:text-orange-400 transition-colors">
                        {isAvailable ? "Browser Extension Detected" : "Browser Extension Required"}
                    </span>
                </div>

                {/* Status Indicator */}
                <div className={`absolute right-4 w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : isAvailable ? 'bg-orange-500' : 'bg-zinc-600'}`} />
            </button>

            {error && (
                <p className="text-xs text-red-400 text-center bg-red-900/10 p-2 rounded border border-red-900/20 animate-in fade-in slide-in-from-top-1">
                    {error}
                </p>
            )}
        </div>
    );
}
