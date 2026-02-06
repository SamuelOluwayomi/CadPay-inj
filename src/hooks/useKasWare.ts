'use client';

import { useState, useEffect, useCallback } from 'react';

export const useKasWare = () => {
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<number>(0);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean>(false);
    const [transactions, setTransactions] = useState<any[]>([]);

    // Check if KasWare is installed
    const checkKasWare = useCallback(() => {
        if (typeof window === 'undefined') return false;
        const available = !!window.kasware;
        setIsAvailable(available);
        return available;
    }, []);

    const fetchTransactions = useCallback(async (addr: string) => {
        try {
            // Using Kaspa Explorer API (Testnet-10)
            const response = await fetch(`https://api-tn10.kaspa.org/addresses/${addr}/full-transactions?limit=10`);
            const data = await response.json();

            // Format transactions for the UI
            const formatted = data.map((tx: any) => ({
                signature: tx.transaction_id,
                blockTime: tx.block_time / 1000, // Convert to seconds
                amount: 0, // Would need more logic to sum inputs/outputs for specific address
                isOutgoing: tx.inputs.some((input: any) => input.previous_outpoint_address === addr),
                status: 'Success'
            }));

            setTransactions(formatted);
        } catch (e) {
            console.error("Failed to fetch transactions", e);
            // Fallback to empty or local if API fails
        }
    }, []);

    const fetchBalance = useCallback(async (addr: string) => {
        try {
            if (window.kasware) {
                const balanceData = await window.kasware.getBalance();
                setBalance(balanceData.total / 100000000);
            } else {
                // Fallback to local demo balance
                const localBalance = localStorage.getItem('demo_balance');
                setBalance(localBalance ? parseFloat(localBalance) : 0);
            }
            // Also fetch transactions when balance is fetched
            fetchTransactions(addr);
        } catch (e) {
            console.error("Failed to fetch balance", e);
        }
    }, [fetchTransactions]);

    const connect = async () => {
        setError(null);
        setIsLoading(true);

        try {
            if (!checkKasWare()) {
                window.open('https://www.kasware.xyz/', '_blank');
                throw new Error("KasWare Wallet is not installed.");
            }

            // 1. Request Accounts
            const accounts = await window.kasware!.requestAccounts();
            if (!accounts || accounts.length === 0) {
                throw new Error("No accounts found.");
            }
            const userAddress = accounts[0];

            // 2. Check Network (Must be Testnet-10)
            const network = await window.kasware!.getNetwork();
            if (network !== 'testnet-10') {
                try {
                    await window.kasware!.switchNetwork('testnet-10');
                } catch (e) {
                    throw new Error("Please switch your wallet to Testnet-10.");
                }
            }

            // 3. Get Balance
            const balanceData = await window.kasware!.getBalance();

            setAddress(userAddress);
            setBalance(balanceData.total / 100000000); // Convert from Sompi to KAS
            setIsConnected(true);

            // Save to local storage for persistent session UI (optional, but requested to NOT auto-connect)
            // localStorage.setItem('active_wallet_address', userAddress);

            // Fetch transactions
            fetchTransactions(userAddress);

            return userAddress;

        } catch (err: any) {
            console.error("KasWare Connection Error:", err);

            // SPECIFIC FIX FOR CODE 4900
            if (err.code === 4900) {
                setError("Wallet is disconnected. Please open KasWare and switch to Testnet-10 manually.");
                // Optional: Try to programmatically reconnect
                try {
                    if (window.kasware) {
                        await window.kasware.switchNetwork('testnet-10');
                    }
                } catch (retryErr) {
                    // If that fails, just ask user to do it
                }
            } else if (!err.message?.includes("User rejected")) {
                setError(err.message || "Failed to connect.");
            }
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Initialize availability
    useEffect(() => {
        checkKasWare();

        // Listen for account changes if connected
        if (typeof window !== 'undefined' && window.kasware) {
            window.kasware.on('accountsChanged', (accounts: string[]) => {
                if (accounts.length > 0) {
                    setAddress(accounts[0]);
                    fetchBalance(accounts[0]);
                } else {
                    setAddress(null);
                    setIsConnected(false);
                }
            });
        }
    }, [checkKasWare, fetchBalance]);

    const refreshBalance = useCallback(() => {
        if (address) {
            fetchBalance(address);
        }
    }, [address, fetchBalance]);

    const disconnect = useCallback(() => {
        setAddress(null);
        setBalance(0);
        setIsConnected(false);
        setTransactions([]);
        localStorage.removeItem('active_wallet_address');
    }, []);


    return {
        address,
        balance,
        isConnected,
        isAvailable,
        transactions,
        error,
        isLoading,
        connect,
        disconnect,
        refreshBalance,
        fetchTransactions: () => address && fetchTransactions(address)
    };
};
