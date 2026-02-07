/**
 * Hook for managing fund requests
 * Fetches pending requests, subscribes to real-time updates,
 * and provides admin operations
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface FundRequest {
    id: string;
    user_address: string;
    amount: number;
    status: 'pending' | 'approved' | 'failed';
    tx_id?: string;
    error_message?: string;
    created_at: string;
    processed_at?: string;
}

export function useFundRequests(userAddress?: string) {
    const [requests, setRequests] = useState<FundRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch fund requests
    const fetchRequests = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            let query = supabase
                .from('fund_requests')
                .select('*')
                .order('created_at', { ascending: false });

            // Filter by user address if provided
            if (userAddress) {
                query = query.eq('user_address', userAddress);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            setRequests(data || []);
        } catch (err: any) {
            console.error('Failed to fetch fund requests:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [userAddress]);

    // Subscribe to real-time updates
    useEffect(() => {
        fetchRequests();

        // Set up real-time subscription
        const channel = supabase
            .channel('fund_requests_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'fund_requests',
                    filter: userAddress ? `user_address=eq.${userAddress}` : undefined
                },
                (payload) => {
                    console.log('Fund request update:', payload);
                    fetchRequests();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchRequests, userAddress]);

    // Get pending requests only
    const pendingRequests = requests.filter(r => r.status === 'pending');

    // Get user's latest request
    const latestRequest = userAddress ? requests[0] : null;

    // Update request status (admin only)
    const updateRequestStatus = async (
        requestId: string,
        status: 'approved' | 'failed',
        txId?: string,
        errorMessage?: string
    ) => {
        try {
            const { error: updateError } = await supabase
                .from('fund_requests')
                .update({
                    status,
                    tx_id: txId,
                    error_message: errorMessage,
                    processed_at: new Date().toISOString()
                })
                .eq('id', requestId);

            if (updateError) throw updateError;

            // Refresh requests
            await fetchRequests();

            return { success: true };
        } catch (err: any) {
            console.error('Failed to update request status:', err);
            return { success: false, error: err.message };
        }
    };

    return {
        requests,
        pendingRequests,
        latestRequest,
        isLoading,
        error,
        updateRequestStatus,
        refetch: fetchRequests
    };
}
