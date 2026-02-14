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
            // Using Proxy API
            const response = await fetch(`/api/kaspa/transactions?address=${addr}&limit=10`);
            if (!response.ok) throw new Error("Failed to fetch transactions");
            const data = await response.json();

            // Format transactions for the UI
            const formatted = data.map((tx: any) => {
                const isOutgoing = tx.inputs.some((input: any) => input.previous_outpoint_address === addr);
                let amount = 0;

                if (isOutgoing) {
                    // Outgoing: Sum of outputs that go to OTHER addresses
                    amount = tx.outputs
                        .filter((out: any) => out.script_public_key_address !== addr)
                        .reduce((acc: number, out: any) => acc + (out.amount || 0), 0);
                } else {
                    // Incoming: Sum of outputs that go to THIS address
                    amount = tx.outputs
                        .filter((out: any) => out.script_public_key_address === addr)
                        .reduce((acc: number, out: any) => acc + (out.amount || 0), 0);
                }

                return {
                    signature: tx.transaction_id,
                    blockTime: Math.floor(tx.block_time / 1000),
                    amount: amount / 100000000,
                    isOutgoing,
                    status: 'Success',
                    timestamp: tx.block_time,
                    err: false
                };
            });

            setTransactions(formatted);
        } catch (e) {
            console.error("Failed to fetch transactions", e);
        }
    }, []);

    const fetchBalance = useCallback(async (addr: string) => {
        try {
            let kasWareAddr = null;
            if (window.kasware) {
                const accounts = await window.kasware.getAccounts();
                kasWareAddr = accounts[0];
            }

            if (window.kasware && addr === kasWareAddr) {
                const balanceData = await window.kasware.getBalance();
                setBalance(balanceData.total / 100000000);
            } else {
                // Prioritize proxy API for balance
                const response = await fetch(`/api/kaspa/balance?address=${addr}`);
                if (response.ok) {
                    const data = await response.json();
                    setBalance(data.balance / 100000000);
                } else {
                    // Fallback to local only if API fails
                    const localBalance = localStorage.getItem(`demo_balance_${addr}`);
                    if (localBalance) setBalance(parseFloat(localBalance));
                }
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

    // Initialize availability and passive account check
    useEffect(() => {
        checkKasWare();

        const passiveCheck = async () => {
            if (typeof window !== 'undefined') {
                setIsLoading(true);
                // console.log("🔍 Passive session check started...");
                try {
                    // 1. Check local storage? NO.
                    // We removed this because it was causing "Ghost Wallets" (stale addresses)
                    // that persisted even when the backend had a different custodial wallet.
                    // The source of truth should be window.kasware (if connected) or the DB (if custodial).

                    /*
                    const localAddr = localStorage.getItem('active_wallet_address');
                    if (localAddr) { ... }
                    */

                    // 2. Check KasWare extension
                    if (window.kasware) {
                        console.log("🔍 Checking KasWare for authorized accounts...");
                        const accounts = await window.kasware.getAccounts();
                        if (accounts.length > 0) {
                            console.log("✅ KasWare already authorized:", accounts[0]);
                            setAddress(accounts[0]);
                            setIsConnected(true);
                            await fetchBalance(accounts[0]);
                        } else {
                            console.log("ℹ️ KasWare detected but no accounts authorized.");
                        }
                    } else {
                        console.log("ℹ️ KasWare extension not found.");
                    }
                } catch (e) {
                    console.log("ℹ️ Passive KasWare check failed (normal if not installed/connected)", e);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        passiveCheck();

        // Listen for account changes if connected
        if (typeof window !== 'undefined' && window.kasware) {
            window.kasware.on('accountsChanged', (accounts: string[]) => {
                console.log("🔄 KasWare Account Changed:", accounts);
                if (accounts.length > 0) {
                    setAddress(accounts[0]);
                    setIsConnected(true);
                    fetchBalance(accounts[0]);
                } else {
                    setAddress(null);
                    setIsConnected(false);
                    localStorage.removeItem('active_wallet_address');
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
        fetchTransactions: (addr?: string) => {
            const target = addr || address;
            if (target) return fetchTransactions(target);
            return Promise.resolve();
        }
    };
};
