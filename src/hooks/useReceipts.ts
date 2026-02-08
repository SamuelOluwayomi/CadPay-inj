import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Receipt } from '@/types/Receipt';

export function useReceipts(walletAddress: string | null) {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch receipts for the current wallet
    const fetchReceipts = useCallback(async () => {
        if (!walletAddress) {
            setReceipts([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('receipts')
                .select('*')
                .eq('wallet_address', walletAddress)
                .order('timestamp', { ascending: false });

            if (fetchError) throw fetchError;

            setReceipts(data || []);
        } catch (err: any) {
            console.error('Error fetching receipts:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [walletAddress]);

    // Create a new receipt
    const createReceipt = async (receipt: Omit<Receipt, 'id' | 'timestamp'>): Promise<Receipt | null> => {
        try {
            const { data, error: insertError } = await supabase
                .from('receipts')
                .insert([receipt])
                .select()
                .single();

            if (insertError) throw insertError;

            // Refresh receipts list
            await fetchReceipts();

            return data;
        } catch (err: any) {
            console.error('Error creating receipt:', err);
            setError(err.message);
            return null;
        }
    };

    // Calculate total spending
    const totalSpending = receipts
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + r.amount_kas, 0);

    const totalSpendingUSD = receipts
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + r.amount_usd, 0);

    // Auto-fetch on mount and wallet change
    useEffect(() => {
        fetchReceipts();
    }, [fetchReceipts]);

    return {
        receipts,
        loading,
        error,
        fetchReceipts,
        createReceipt,
        totalSpending,
        totalSpendingUSD,
    };
}
