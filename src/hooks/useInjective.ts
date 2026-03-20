'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { INJECTIVE_NETWORK, INJECTIVE_CHAIN_ID } from '@/lib/injective-wallet';

export const useInjective = () => {
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<number>(0);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    const [transactions, setTransactions] = useState<any[]>([]);
    const txCountRef = useRef(0);
    const initialFetchDone = useRef(false);

    const fetchTransactions = useCallback(async (addr: string, isManual = false) => {
        if (!addr) return;
        
        // Loader logic: Only show if it matches manual refresh OR if it's the absolute first fetch
        if (isManual || !initialFetchDone.current) {
            setIsLoading(true);
        }

        try {
            const response = await fetch(`/api/injective/transactions?address=${addr}`);
            if (response.ok) {
                const data = await response.json();
                const newTxs = data.transactions || [];
                setTransactions(newTxs);
                txCountRef.current = newTxs.length;
            }
        } catch (e) {
            // Error
        } finally {
            initialFetchDone.current = true;
            setIsLoading(false);
        }
    }, []);

    const fetchBalance = useCallback(async (addr: string) => {
        if (!addr) return;
        try {
            const response = await fetch(`/api/injective/balance?address=${addr}`);
            if (response.ok) {
                const data = await response.json();
                const uinjBalance = data.balances?.find((b: any) => b.denom === 'uinj' || b.denom === 'inj');
                const amount = uinjBalance?.amount || '0';
                setBalance(parseInt(amount) / 1e18);
            }
        } catch (e) {
            console.error("Failed to fetch balance via proxy", e);
        }
    }, []);

    // 1. Initial Load & Address Sync
    useEffect(() => {
        const cachedAddress = localStorage.getItem('active_wallet_address');
        if (cachedAddress) {
            setAddress(cachedAddress);
            setIsConnected(true);
        }

        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'active_wallet_address') {
                if (e.newValue) {
                    setAddress(e.newValue);
                    setIsConnected(true);
                } else {
                    setAddress(null);
                    setIsConnected(false);
                    setBalance(0);
                    setTransactions([]);
                }
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // 2. Data Fetching & Auto-Refresh
    useEffect(() => {
        if (!address || !isConnected) return;

        // Initial fetch
        fetchBalance(address);
        fetchTransactions(address);

        // Background polling every 30 seconds
        const interval = setInterval(() => {
            fetchBalance(address);
            fetchTransactions(address);
        }, 30000);

        return () => clearInterval(interval);
    }, [address, isConnected]); // Only re-run when address or connection status changes

    const connect = async (manualAddress?: string) => {
        setIsConnecting(true);
        try {
            if (manualAddress) {
                setAddress(manualAddress);
                setIsConnected(true);
                localStorage.setItem('active_wallet_address', manualAddress);
                return manualAddress;
            }
            
            const storageAddr = localStorage.getItem('active_wallet_address');
            if (storageAddr) {
                setAddress(storageAddr);
                setIsConnected(true);
                return storageAddr;
            }
            return null;
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnect = useCallback(() => {
        setAddress(null);
        setBalance(0);
        setTransactions([]);
        setIsConnected(false);
        localStorage.removeItem('active_wallet_address');
    }, []);

    return {
        address,
        balance,
        transactions,
        isConnected,
        error,
        isLoading,
        isConnecting,
        connect,
        disconnect,
        refreshBalance: () => address && fetchBalance(address),
        fetchTransactions: (isManual = false): void | Promise<void> => {
            if (address) return fetchTransactions(address, isManual);
        },
    };
};
