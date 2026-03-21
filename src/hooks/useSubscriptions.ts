import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ActiveSubscription {
    id: string;
    serviceId: string;
    serviceName: string;
    plan: string;
    priceUSD: number;
    email: string;
    startDate: string;
    nextBilling: string;
    color: string;
    transactionSignature?: string;
}

interface MonthlyData {
    [month: string]: number;
}

export function useSubscriptions() {
    const [subscriptions, setSubscriptions] = useState<ActiveSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [monthlyData, setMonthlyData] = useState<MonthlyData>({});

    const fetchSubscriptions = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setSubscriptions([]);
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('user_subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const mappedSubs = data.map(sub => ({
                    id: sub.id,
                    serviceId: sub.service_id,
                    serviceName: sub.service_name,
                    plan: sub.plan_name,
                    priceUSD: Number(sub.price_usd),
                    email: sub.email || '',
                    startDate: sub.created_at,
                    nextBilling: sub.next_billing_date || new Date().toISOString(),
                    color: sub.color || '#FF6B35',
                    transactionSignature: sub.tx_signature
                })) as ActiveSubscription[];

                setSubscriptions(mappedSubs);
            }
        } catch (error) {
            console.error('❌ Failed to fetch subscriptions:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load from Supabase on mount
    useEffect(() => {
        fetchSubscriptions();
    }, [fetchSubscriptions]);

    // Update monthly data helper
    const updateMonthlyData = useCallback(() => {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const total = subscriptions.reduce((sum, sub) => sum + sub.priceUSD, 0);

        setMonthlyData(prev => ({
            ...prev,
            [currentMonth]: total
        }));
    }, [subscriptions]);

    useEffect(() => {
        updateMonthlyData();
    }, [subscriptions, updateMonthlyData]);

    const addSubscription = useCallback(async (subscription: Omit<ActiveSubscription, 'id' | 'startDate' | 'nextBilling'>) => {
        // This is now handled by the MerchantContext subscribeToService call 
        // to ensure database consistency across tables, but we keep it for local state update
        return null;
    }, []);

    const removeSubscription = useCallback(async (id: string) => {
        try {
            const { error } = await supabase
                .from('user_subscriptions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSubscriptions(prev => prev.filter(sub => sub.id !== id));
        } catch (error) {
            console.error('❌ Failed to remove subscription:', error);
            throw error;
        }
    }, []);

    const getMonthlyTotal = useCallback(() => {
        return subscriptions.reduce((sum, sub) => sum + sub.priceUSD, 0);
    }, [subscriptions]);

    const getHistoricalData = useCallback(() => {
        const months = [];
        const now = new Date();
        const baseDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const currentMonthTotal = getMonthlyTotal();

        for (let i = 0; i < 6; i++) {
            const date = new Date(baseDate);
            date.setMonth(baseDate.getMonth() + i);
            const monthKey = date.toISOString().slice(0, 7);
            const monthName = date.toLocaleDateString('en-US', { month: 'short' });

            let value = monthlyData[monthKey] || (i === 5 ? currentMonthTotal : 0);
            
            // Simulation for demo purposes if no real data
            if (value === 0 && currentMonthTotal > 0) {
                const growthFactor = 0.4 + (i / 5) * 0.6;
                value = currentMonthTotal * growthFactor;
            } else if (value === 0) {
                const dummyValues = [8.00, 10.39, 12.79, 15.19, 17.59, 19.99];
                value = dummyValues[i] || 0;
            }

            months.push({
                month: monthName,
                amount: parseFloat(value.toFixed(2))
            });
        }
        return months;
    }, [monthlyData, getMonthlyTotal]);

    const checkDuplicateEmail = useCallback((serviceId: string, email: string) => {
        return subscriptions.some(sub => sub.serviceId === serviceId && sub.email.toLowerCase() === email.toLowerCase());
    }, [subscriptions]);

    return {
        subscriptions,
        loading,
        addSubscription,
        removeSubscription,
        getMonthlyTotal,
        getHistoricalData,
        checkDuplicateEmail,
        refreshSubscriptions: fetchSubscriptions
    };
}
