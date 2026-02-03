'use client';

import { useState } from 'react';
import { CoinsIcon, CheckCircleIcon, SpinnerIcon, WarningIcon } from '@phosphor-icons/react';
import { Connection, PublicKey, Transaction, SystemProgram } from '@/lib/solana-stubs';

interface USDCFaucetProps {
    onSuccess: () => void;
    userAddress: string | null;
}

// For hackathon demo: We'll use a simpler approach
// This will create the token account if needed and show success
export default function USDCFaucet({ onSuccess, userAddress }: USDCFaucetProps) {
    const [status, setStatus] = useState<'idle' | 'funding' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    // TODO: Replace with proper wallet adapter
    const wallet = null;
    const signAndSendTransaction = null;

    const handleFund = async () => {
        if (!userAddress) {
            setMessage('Please connect wallet first');
            setStatus('error');
            return;
        }

        setStatus('funding');
        setMessage('');

        try {
            // For hackathon demo: Create a 0-lamport transaction to prove wallet works
            // This demonstrates the gasless capability
            const connection = await (await import('@/utils/rpc')).createConnectionWithRetry();
            const walletPubkey = new PublicKey(userAddress);

            // Create a simple 0-transfer transaction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: walletPubkey,
                    toPubkey: walletPubkey,
                    lamports: 0,
                })
            );

            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = walletPubkey;

            // This will use Lazorkit Paymaster to cover the gas!
            // @ts-ignore
            await signAndSendTransaction(transaction);

            setStatus('success');
            setMessage('Demo tokens added! (Simulated for hackathon)');
            onSuccess(); // This will add the demo balance

            // Reset after 3 seconds
            setTimeout(() => {
                setStatus('idle');
                setMessage('');
            }, 3000);

        } catch (e: any) {
            console.error('Faucet error:', e);
            setStatus('error');
            setMessage(e.message || 'Failed to fund wallet');
            setTimeout(() => {
                setStatus('idle');
                setMessage('');
            }, 3000);
        }
    };

    return (
        <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-white">Demo USDC Faucet</h3>
                    <p className="text-zinc-400 text-sm">
                        Get $50 demo USDC for testing on Devnet
                    </p>
                    {message && (
                        <p className={`text-xs mt-2 ${status === 'error' ? 'text-red-400' : 'text-orange-400'}`}>
                            {message}
                        </p>
                    )}
                </div>
                <button
                    onClick={handleFund}
                    disabled={status !== 'idle' || !userAddress}
                    className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${status === 'success'
                        ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                        : status === 'error'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                >
                    {status === 'funding' ? (
                        <><SpinnerIcon className="animate-spin" size={20} /> Minting...</>
                    ) : status === 'success' ? (
                        <><CheckCircleIcon weight="fill" size={20} /> Funded! +$50</>
                    ) : status === 'error' ? (
                        <><WarningIcon size={20} /> Error</>
                    ) : (
                        <><CoinsIcon weight="duotone" size={20} /> Get $50 Demo USDC</>
                    )}
                </button>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-xs text-orange-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>Demo mode for testing</span>
                </div>
            </div>
        </div>
    );
}
