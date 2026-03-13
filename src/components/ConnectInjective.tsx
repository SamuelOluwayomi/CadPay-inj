'use client';

import { useInjective } from '@/hooks/useInjective';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Wallet } from '@injectivelabs/wallet-ts';


export default function ConnectInjective() {
    const { connect, isConnected, isLoading: isWalletLoading, error } = useInjective();
    const { signInWithInjective, isLoading: isAuthLoading } = useAuth(); // Use auth hook
    const router = useRouter();

    const isLoading = isWalletLoading || isAuthLoading;

    const handleConnect = async (wallet: Wallet) => {
        try {
            // 1. Connect Wallet
            const addr = await connect(wallet);

            if (addr) {
                // 2. Authenticate with CadPay (Supabase)
                console.log("Connected to Injective, authenticating session...");
                const result = await signInWithInjective(addr);

                if (result.success) {
                    console.log("Logged in and authenticated as:", addr);
                    // Redirect to dashboard
                    router.push('/dashboard');
                } else {
                    console.error("Authentication failed:", result.error);
                }
            }
        } catch (e) {
            console.error("Connection flow failed:", e);
        }
    };

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="grid grid-cols-2 gap-3 w-full">
                <button
                    onClick={() => handleConnect(Wallet.Keplr)}
                    disabled={isLoading || isConnected}
                    className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 hover:border-orange-500/50 transition-all disabled:opacity-50"
                >
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-orange-900/20">
                        K
                    </div>
                    <span className="font-bold text-white text-sm">Keplr</span>
                </button>

                <button
                    onClick={() => handleConnect(Wallet.Leap)}
                    disabled={isLoading || isConnected}
                    className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 hover:border-green-500/50 transition-all disabled:opacity-50"
                >
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-green-900/20">
                        L
                    </div>
                    <span className="font-bold text-white text-sm">Leap</span>
                </button>
            </div>

            {error && (
                <p className="text-xs text-red-400 text-center bg-red-900/10 p-2 rounded border border-red-900/20 animate-in fade-in slide-in-from-top-1">
                    {error}
                </p>
            )}
            
            {isConnected && (
                <p className="text-xs text-green-400 text-center bg-green-900/10 p-2 rounded border border-green-900/20">
                    Connected to Injective! Authenticating...
                </p>
            )}
        </div>
    );
}
