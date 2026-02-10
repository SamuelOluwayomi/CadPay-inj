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

import { useKasWare } from './useKasWare';

export const useSavings = () => {
    const { address: userAddress } = useKasWare();
    const [pots, setPots] = useState<SavingsPot[]>([]);
    const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch pots from Supabase
    const fetchPots = useCallback(async () => {
        if (!userAddress) {
            setPots([]);
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('savings_pots')
                .select('*')
                .eq('user_address', userAddress)
                .eq('status', 'active');

            if (error) throw error;
            setPots(data || []);
        } catch (e) {
            console.error("Failed to fetch pots:", e);
        } finally {
            setIsLoading(false);
        }
    }, [userAddress]);

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
        if (!userAddress) return null;

        const newPot = {
            user_address: userAddress,
            name,
            address: generateKaspaAddress(),
            balance: 0,
            duration_months: durationMonths,
            unlock_time: Math.floor(Date.now() / 1000) + (durationMonths * 30 * 24 * 60 * 60),
            status: 'active'
        };

        try {
            const { data, error } = await supabase
                .from('savings_pots')
                .insert([newPot])
                .select()
                .single();

            if (error) throw error;
            setPots(prev => [...prev, data]);
            return data;
        } catch (e) {
            console.error("Failed to create pot:", e);
            return null;
        }
    }, [userAddress]);

    const depositToPot = useCallback(async (potId: string, amount: number) => {
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
                    tx_hash: generateKaspaAddress().slice(0, 20) // Mock hash
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
