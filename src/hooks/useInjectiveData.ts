import { useState, useEffect, useCallback, useRef } from 'react';

interface Transaction {
    id: string;
    timestamp: number;
    amount: number;
    sender: string;
    isIncoming: boolean;
    status: 'Success' | 'Pending' | 'Failed';
}

interface InjectiveDataStats {
    revenue: number;
    txCount: number;
    uniqueCustomers: number;
    mrr: number;
}

// Demo data for fallback
const DEMO_TRANSACTIONS: Transaction[] = [
    {
        id: 'demo_tx_1',
        timestamp: Date.now() - 3600000,
        amount: 125.50,
        sender: 'inj1demo1abc',
        isIncoming: true,
        status: 'Success'
    },
    {
        id: 'demo_tx_2',
        timestamp: Date.now() - 7200000,
        amount: 250.00,
        sender: 'inj1demo2xyz',
        isIncoming: true,
        status: 'Success'
    },
    {
        id: 'demo_tx_3',
        timestamp: Date.now() - 10800000,
        amount: 99.99,
        sender: 'inj1demo3qwe',
        isIncoming: true,
        status: 'Success'
    },
];

const DEMO_STATS: InjectiveDataStats = {
    revenue: 475.49,
    txCount: 3,
    uniqueCustomers: 3,
    mrr: 475.49
};

export const useInjectiveData = (address: string | null, onApiRecovered?: () => void) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<InjectiveDataStats>({
        revenue: 0,
        txCount: 0,
        uniqueCustomers: 0,
        mrr: 0
    });
    const [balance, setBalance] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isUsingDemoData, setIsUsingDemoData] = useState<boolean>(false);

    const healthCheckInterval = useRef<NodeJS.Timeout | null>(null);
    const wasUsingDemo = useRef<boolean>(false);

    const fetchData = useCallback(async () => {
        if (!address) return;

        setIsLoading(true);
        setError(null);

        try {
            // 1. Fetch Balance
            const balanceRes = await fetch(`/api/injective/balance?address=${address}`);
            if (balanceRes.ok) {
                const balanceData = await balanceRes.json();
                // Injective balance is usually in uinj, but let's assume the API returns INJ for consistency or handle uinj here
                setBalance(balanceData.balance || 0);
            }

            // 2. Fetch Transactions
            const txRes = await fetch(`/api/injective/transactions?address=${address}&limit=50`);
            if (!txRes.ok) throw new Error("Failed to fetch transactions");

            const txData = await txRes.json();

            // 3. Process Transactions (Simple mapping for demo/Injective structure)
            const processedTxs: Transaction[] = txData.txs?.map((tx: any) => {
                const isIncoming = tx.body.messages[0].to_address === address;
                const amount = tx.body.messages[0].amount?.[0]?.amount || 0;

                return {
                    id: tx.tx_hash,
                    timestamp: new Date(tx.timestamp).getTime(),
                    amount: parseFloat(amount) / 1000000, // Convert uinj to INJ
                    sender: tx.body.messages[0].from_address,
                    isIncoming: isIncoming,
                    status: 'Success'
                };
            }) || [];

            // 4. Calculate Stats
            const incomingTxs = processedTxs.filter(tx => tx.isIncoming);
            const totalRevenue = incomingTxs.reduce((acc, tx) => acc + tx.amount, 0);
            const uniqueSenders = new Set(incomingTxs.map(tx => tx.sender)).size;
            const mrr = totalRevenue;

            setTransactions(processedTxs);
            setStats({
                revenue: totalRevenue,
                txCount: incomingTxs.length,
                uniqueCustomers: uniqueSenders,
                mrr: mrr
            });

            // Successfully fetched real data
            setIsUsingDemoData(false);

            // If we were using demo data and now recovered, trigger callback
            if (wasUsingDemo.current && onApiRecovered) {
                onApiRecovered();
            }
            wasUsingDemo.current = false;

        } catch (err: any) {
            console.error("Injective Data Fetch Error:", err);

            // Switch to demo data
            setIsUsingDemoData(true);
            wasUsingDemo.current = true;
            setBalance(1000); // Demo balance
            setTransactions(DEMO_TRANSACTIONS);
            setStats(DEMO_STATS);

            if (err.message?.includes('Failed to fetch') || err.message?.includes('API Error')) {
                setError("Using demo data - Injective API temporarily unavailable");
            } else {
                setError(err.message || "Failed to load data");
            }
        } finally {
            setIsLoading(false);
        }
    }, [address, onApiRecovered]);

    // Health check to detect API recovery
    const startHealthCheck = useCallback(() => {
        if (healthCheckInterval.current) {
            clearInterval(healthCheckInterval.current);
        }

        healthCheckInterval.current = setInterval(async () => {
            if (!address || !isUsingDemoData) return;

            try {
                // Quick ping to check if API is back
                const response = await fetch(`/api/injective/balance?address=${address}`);
                if (response.ok) {
                    // API is back! Refetch data
                    fetchData();
                }
            } catch {
                // Still down, do nothing
            }
        }, 30000); // Check every 30 seconds
    }, [address, isUsingDemoData, fetchData]);

    // Initial fetch
    useEffect(() => {
        if (address) {
            fetchData();
        }
    }, [address, fetchData]);

    // Start health check when using demo data
    useEffect(() => {
        if (isUsingDemoData) {
            startHealthCheck();
        }

        return () => {
            if (healthCheckInterval.current) {
                clearInterval(healthCheckInterval.current);
            }
        };
    }, [isUsingDemoData, startHealthCheck]);

    return {
        balance,
        transactions,
        stats,
        isLoading,
        error,
        isUsingDemoData,
        refetch: fetchData
    };
};
