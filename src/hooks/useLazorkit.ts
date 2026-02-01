// STUB: This hook was removed during Lazorkit integration cleanup
// TODO: Implement proper wallet integration using Solana wallet adapters

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Connection, Transaction } from '@solana/web3.js';

// Type definitions to match original hook
type SavingsPot = {
    address: string;
    name: string;
    balance: number;
    solBalance?: number;
    unlockTime?: number;
    isWalletBased?: boolean;
};

export function useLazorkit() {
    const router = useRouter();
    const [loading] = useState(false);

    // Stub all the hook values that were previously provided
    return {
        // Authentication
        address: null as string | null,
        wallet: null as any,
        isAuthenticated: false,
        loading,

        // Actions
        loginWithPasskey: async () => {
            throw new Error('Wallet integration needed - useLazorkit was removed');
        },
        createPasskeyWallet: async () => {
            throw new Error('Wallet integration needed - useLazorkit was removed');
        },
        logout: useCallback(() => {
            router.push('/');
        }, [router]),

        // Balance
        balance: null as number | null,
        requestAirdrop: async () => {
            throw new Error('Wallet integration needed - useLazorkit was removed');
        },
        refreshBalance: async () => { },

        // Transactions
        signAndSendTransaction: async (tx: Transaction | { instructions: any[], transactionOptions?: any }): Promise<string> => {
            throw new Error('Wallet integration needed - sign and send transaction not available');
        },
        connection: new Connection(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com'),

        // Savings pots
        pots: [] as SavingsPot[],
        fetchPots: async () => { },
        createPot: async (name: string, unlockTime: number) => {
            throw new Error('Wallet integration needed - useLazorkit was removed');
        },
        withdrawFromPot: async (address: string, recipient: string, amount: number, note?: string) => {
            throw new Error('Wallet integration needed - useLazorkit was removed');
        },
    };
}
