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
    const fetchReceipts = useCallback(async () => {
        if (!walletAddress) {
            setReceipts([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const normalizedAddr = walletAddress.toLowerCase();
            console.log('🔍 [useReceipts] Fetching receipts for:', normalizedAddr);
            const { data, error: fetchError } = await supabase
                .from('receipts')
                .select('*')
                .eq('wallet_address', normalizedAddr)
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
            const normalizedReceipt = {
                ...receipt,
                wallet_address: receipt.wallet_address.toLowerCase()
            };
            console.log('📝 Creating receipt in Supabase:', normalizedReceipt);
            const { data, error: insertError } = await supabase
                .from('receipts')
                .insert([normalizedReceipt])
                .select()
                .single();

            if (insertError) {
                console.error('Supabase Insert Error:', insertError);
                throw insertError;
            }

            console.log('✅ Receipt created successfully:', data);
            // Refresh receipts list
            await fetchReceipts();

            return data;
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
