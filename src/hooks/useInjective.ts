'use client';

import { useState, useEffect, useCallback } from 'react';
import { INJECTIVE_NETWORK, INJECTIVE_CHAIN_ID } from '@/lib/injective-wallet';

export const useInjective = () => {
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<number>(0);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [transactions, setTransactions] = useState<any[]>([]);

    const fetchTransactions = useCallback(async (addr: string) => {
        if (!addr) return;
        try {
            const response = await fetch(`/api/injective/transactions?address=${addr}`);
            if (response.ok) {
                const data = await response.json();
                setTransactions(data.transactions || []);
            }
        } catch (e) {
            console.error("Failed to fetch transactions via proxy", e);
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

    // Sync with localStorage
    useEffect(() => {
        // Check for cached address (from Biometric/Google flow)
        const cachedAddress = localStorage.getItem('active_wallet_address');
        if (cachedAddress) {
            console.log('🔌 [useInjective] Active address detected:', cachedAddress);
            setAddress(cachedAddress);
            setIsConnected(true);
            fetchBalance(cachedAddress);
            fetchTransactions(cachedAddress);
        }

        // Listen for storage changes
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'active_wallet_address') {
                if (e.newValue) {
                    setAddress(e.newValue);
                    setIsConnected(true);
                    fetchBalance(e.newValue);
                } else {
                    setAddress(null);
                    setIsConnected(false);
                    setBalance(0);
                }
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [fetchBalance, fetchTransactions]);

    const connect = async (manualAddress?: string) => {
        if (manualAddress) {
            setAddress(manualAddress);
            setIsConnected(true);
            localStorage.setItem('active_wallet_address', manualAddress);
            await fetchBalance(manualAddress);
            await fetchTransactions(manualAddress);
            return manualAddress;
        }
        
        // If no manual address, just check storage
        const storageAddr = localStorage.getItem('active_wallet_address');
        if (storageAddr) {
            setAddress(storageAddr);
            setIsConnected(true);
            return storageAddr;
        }
        return null;
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
        connect,
        disconnect,
        refreshBalance: () => address && fetchBalance(address),
        fetchTransactions: (addr?: string) => fetchTransactions(addr || address || ''),
    };
};
