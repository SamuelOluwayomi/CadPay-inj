'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface SavingsPot {
    id: string;
    user_address: string;
    name: string;
    address: string;
    balance: number;
    unlock_time: number;
    created_at: string;
    duration_months: number;
    status: 'active' | 'closed';
}

export interface SavingsTransaction {
    id: string;
    pot_id: string;
    amount: number;
    type: 'deposit' | 'withdraw';
    currency: 'KAS' | 'USDC';
    tx_hash: string;
    created_at: string;
}

// Helper to generate a random Kaspa-like address for demo purposes
const generateKaspaAddress = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'kaspatest:q';
    for (let i = 0; i < 60; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

import { useUserProfile } from '@/hooks/useUserProfile';
import { useKasWare } from './useKasWare';

export const useSavings = () => {
    const { address: userAddress } = useKasWare();
    const { profile } = useUserProfile();
    // Prioritize connected wallet, fallback to custodial profile authority
    const effectiveAddress = userAddress || profile?.authority;

    const [pots, setPots] = useState<SavingsPot[]>([]);
    const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch pots from Supabase and sync with on-chain balance
    const fetchPots = useCallback(async () => {
        if (!effectiveAddress) {
            setPots([]);
            setIsLoading(false);
            return;
        }

        try {
            // 1. Get Pots from DB
            const { data: dbPots, error } = await supabase
                .from('savings_pots')
                .select('*')
                .eq('user_address', effectiveAddress)
                .eq('status', 'active');

            if (error) throw error;

            const currentPots = dbPots || [];

            // 2. Fetch Live Balances from Chain
            const updatedPots = await Promise.all(currentPots.map(async (pot) => {
                try {
                    const res = await fetch(`https://api-tn10.kaspa.org/addresses/${pot.address}/balance`);
                    if (res.ok) {
                        const balanceData = await res.json();
                        const liveBalance = balanceData.balance / 100000000; // Convert Sompi to KAS

                        // If balance changed, update DB silently
                        if (liveBalance !== pot.balance) {
                            supabase.from('savings_pots')
                                .update({ balance: liveBalance })
                                .eq('id', pot.id)
                                .then(({ error }) => {
                                    if (error) console.error(`Failed to sync balance for pot ${pot.name}`, error);
                                });

                            return { ...pot, balance: liveBalance };
                        }
                    } else {
                        const err = await res.text();
                        console.error(`Balance fetch failed for ${pot.address}: ${res.status}`, err);
                    }
                } catch (err) {
                    console.error(`Failed to fetch live balance for pot ${pot.id}`, err);
                }
                return pot;
            }));

            setPots(updatedPots);
        } catch (e) {
            console.error("Failed to fetch pots:", e);
        } finally {
            setIsLoading(false);
        }
    }, [effectiveAddress]);

    // Fetch transactions for a specific pot
    const fetchTransactions = useCallback(async (potId: string) => {
        try {
            const { data, error } = await supabase
                .from('savings_transactions')
                .select('*')
                .eq('pot_id', potId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as SavingsTransaction[];
        } catch (e) {
            console.error("Failed to fetch transactions:", e);
            return [];
        }
    }, []);

    useEffect(() => {
        fetchPots();
    }, [fetchPots]);

    const createPot = useCallback(async (name: string, durationMonths: number) => {
        if (!effectiveAddress) return null;

        try {
            // Call API to generate a real Pot Address (Custodial Sub-wallet)
            // For now, we'll assume we need to create a new API route or use a robust generator.
            // But to fix the "invalid address" error immediately without a new API:
            // We can use a HARDCODED valid testnet address for testing? No, that's bad for uniqueness.
            // We should use the /api/wallet/create route but adapted?

            // Better approach: Let's create a real address via a new API route or update this to use a valid format.
            // Since I cannot easily create a new API route in this single step efficiently without checking existing ones,
            // I will first check what API routes exist.

            // Placeholder: I will assume I need to create the API route.
            // But first, let's just make the mock address "valid-ish" so the faucet MIGHT accept it if it just checks regex?
            // No, faucet checks on-chain or at least checksum. Random string won't work.

            // 1. Generate Valid Pot Address via API
            const res = await fetch('/api/savings/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: effectiveAddress, name, durationMonths })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to generate pot address");
            }

            const data = await res.json();

            if (!data.success || !data.pot) {
                throw new Error("Invalid response from savings API");
            }

            const insertedPot = data.pot;

            setPots(prev => [...prev, insertedPot as SavingsPot]);
            return insertedPot;
        } catch (e) {
            console.error(e);
            return null;
        }
    }, [effectiveAddress]);

    const depositToPot = useCallback(async (potId: string, amount: number, txHash?: string) => {
        const pot = pots.find(p => p.id === potId);
        if (!pot) return;

        const newBalance = pot.balance + amount;

        try {
            // Update balance
            const { error: updateError } = await supabase
                .from('savings_pots')
                .update({ balance: newBalance })
                .eq('id', potId);

            if (updateError) throw updateError;

            // Create receipt
            const { error: txError } = await supabase
                .from('savings_transactions')
                .insert([{
                    pot_id: potId,
                    amount,
                    type: 'deposit',
                    currency: 'KAS',
                    tx_hash: txHash || `mock_${generateKaspaAddress().slice(0, 16)}`
                }]);

            if (txError) throw txError;

            setPots(prev => prev.map(p => p.id === potId ? { ...p, balance: newBalance } : p));
        } catch (e) {
            console.error("Failed to deposit:", e);
        }
    }, [pots]);

    const withdrawFromPot = useCallback(async (potId: string, amount: number) => {
        const pot = pots.find(p => p.id === potId);
        if (!pot) return;

        const newBalance = Math.max(0, pot.balance - amount);

        try {
            // Update balance
            const { error: updateError } = await supabase
                .from('savings_pots')
                .update({ balance: newBalance })
                .eq('id', potId);

            if (updateError) throw updateError;

            // Create receipt
            const { error: txError } = await supabase
                .from('savings_transactions')
                .insert([{
                    pot_id: potId,
                    amount,
                    type: 'withdraw',
                    currency: 'KAS',
                    tx_hash: generateKaspaAddress().slice(0, 20) // Mock hash
                }]);

            if (txError) throw txError;

            setPots(prev => prev.map(p => p.id === potId ? { ...p, balance: newBalance } : p));
        } catch (e) {
            console.error("Failed to withdraw:", e);
        }
    }, [pots]);

    return {
        pots,
        isLoading,
        createPot,
        depositToPot,
        withdrawFromPot,
        fetchTransactions,
        refreshPots: fetchPots
    };
};
