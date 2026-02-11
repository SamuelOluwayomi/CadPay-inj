import { useState, useEffect, useCallback, useRef } from 'react';

interface Transaction {
    id: string;
    timestamp: number;
    amount: number;
    sender: string;
    isIncoming: boolean;
    status: 'Success' | 'Pending' | 'Failed';
}

interface KaspaDataStats {
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
        sender: 'kaspatest:demo1abc',
        isIncoming: true,
        status: 'Success'
    },
    {
        id: 'demo_tx_2',
        timestamp: Date.now() - 7200000,
        amount: 250.00,
        sender: 'kaspatest:demo2xyz',
        isIncoming: true,
        status: 'Success'
    },
    {
        id: 'demo_tx_3',
        timestamp: Date.now() - 10800000,
        amount: 99.99,
        sender: 'kaspatest:demo3qwe',
        isIncoming: true,
        status: 'Success'
    },
];

const DEMO_STATS: KaspaDataStats = {
    revenue: 475.49,
    txCount: 3,
    uniqueCustomers: 3,
    mrr: 475.49
};

export const useKaspaData = (address: string | null, onApiRecovered?: () => void) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<KaspaDataStats>({
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
            const balanceRes = await fetch(`/api/kaspa/balance?address=${address}`);
            if (balanceRes.ok) {
                const balanceData = await balanceRes.json();
                setBalance(balanceData.balance / 100000000);
            }

            // 2. Fetch Transactions
            const txRes = await fetch(`/api/kaspa/transactions?address=${address}&limit=50`);
            if (!txRes.ok) throw new Error("Failed to fetch transactions");

            const txData = await txRes.json();

            // 3. Process Transactions
            const processedTxs: Transaction[] = txData.map((tx: any) => {
                const myInput = tx.inputs.find((input: any) => input.previous_outpoint_address === address);
                const isIncoming = !myInput;

                let amount = 0;
                let sender = 'Unknown';

                if (isIncoming) {
                    // For incoming transactions, only count the FIRST output to this address
                    // This avoids counting change that comes back to sender
                    const myOutputs = tx.outputs.filter((out: any) => out.script_public_key_address === address);
                    if (myOutputs.length > 0) {
                        amount = myOutputs[0].amount || 0; // Take only the first output
                    }

                    if (tx.inputs.length > 0) {
                        sender = tx.inputs[0].previous_outpoint_address;
                    }
                } else {
                    amount = tx.outputs
                        .filter((out: any) => out.script_public_key_address !== address)
                        .reduce((acc: number, out: any) => acc + (out.amount || 0), 0);

                    sender = 'Me';
                }

                return {
                    id: tx.transaction_id,
                    timestamp: tx.block_time,
                    amount: amount / 100000000,
                    sender: sender,
                    isIncoming: isIncoming,
                    status: 'Success'
                };
            });

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
            console.error("Kaspa Data Fetch Error:", err);

            // Switch to demo data
            setIsUsingDemoData(true);
            wasUsingDemo.current = true;
            setBalance(1000); // Demo balance
            setTransactions(DEMO_TRANSACTIONS);
            setStats(DEMO_STATS);

            if (err.message?.includes('Failed to fetch') || err.message?.includes('API Error')) {
                setError("Using demo data - Kaspa API temporarily unavailable");
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
                const response = await fetch(`/api/kaspa/balance?address=${address}`);
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
