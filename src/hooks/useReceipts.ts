import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Receipt } from '@/types/Receipt';
import { useToast } from '@/context/ToastContext';

export function useReceipts(walletAddress: string | null) {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { showToast } = useToast();

    // Fetch receipts for the current wallet
    const fetchReceipts = useCallback(async (background = false) => {
        if (!walletAddress) {
            setReceipts([]);
            return;
        }

        if (!background) setLoading(true);
        if (!background) setError(null);

        try {
            const normalizedAddr = walletAddress.toLowerCase();
            const { data, error: fetchError } = await supabase
                .from('receipts')
                .select('*')
                .eq('wallet_address', normalizedAddr)
                .order('timestamp', { ascending: false });

            if (fetchError) throw fetchError;

            setReceipts(data || []);
        } catch (err: any) {
            console.error('Error fetching receipts:', err);
            if (!background) setError(err.message);
        } finally {
            if (!background) setLoading(false);
        }
    }, [walletAddress]);

    // Create a new receipt using the Secure Backend Proxy
    const createReceipt = async (receipt: Omit<Receipt, 'id' | 'timestamp'>): Promise<Receipt | null> => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Authentication required to save receipts.");

            const response = await fetch('/api/transactions/receipt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(receipt)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Backend failed to save receipt');
            }

            // Refresh receipts list
            await fetchReceipts();
            return result.data;
        } catch (err: any) {
            console.error('Error creating receipt:', err);
            setError(err.message);
            showToast(`Failed to save receipt: ${err.message}`, "error");
            return null;
        }
    };

    // Calculate total spending
    const totalSpending = receipts
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + r.amount_inj, 0);

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
