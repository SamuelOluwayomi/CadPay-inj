'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';

export interface SavingsPot {
    id: string;
    user_id: string;
    name: string;
    amount: number;
    tx_hash: string;
    status: 'locked' | 'staked' | 'unstaked';
    created_at: string;
    unlock_date: string;
}

export const useSavings = () => {
    const { session } = useUser();
    const userId = session?.user?.id;

    const [pots, setPots] = useState<SavingsPot[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPots = useCallback(async () => {
        if (!userId) {
            setPots([]);
            setIsLoading(false);
            return;
        }
        try {
            const { data: dbPots, error } = await supabase
                .from('savings_pots')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPots(dbPots || []);
        } catch (e) {
            console.error("Failed to fetch yielding pots:", e);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchPots();
    }, [fetchPots]);

    const createPot = useCallback(async (name: string, amount: number, lockupMonths: number) => {
        if (!userId) throw new Error("User not authenticated.");

        try {
            const res = await fetch('/api/wallet/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, potName: name, amount, lockupMonths })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to stake in Yield-Bearing Pot");
            }

            await fetchPots(); // refresh from DB
            return data.txHash;
        } catch (e) {
            console.error("Failed to create yield pot:", e);
            throw e;
        }
    }, [userId, fetchPots]);

    const breakPot = useCallback(async (potId: string) => {
        if (!userId) throw new Error("User not authenticated.");

        try {
            const res = await fetch('/api/wallet/unstake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, potId })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to unstake and break Yield-Bearing Pot");
            }

            await fetchPots(); // refresh from DB
            return data.txHash;
        } catch (e) {
            console.error("Failed to break yield pot:", e);
            throw e;
        }
    }, [userId, fetchPots]);

    return {
        pots,
        isLoading,
        createPot,
        breakPot,
        refreshPots: fetchPots
    };
};
