'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  WalletStrategy, 
  Wallet, 
  MsgBroadcaster,
} from '@injectivelabs/wallet-ts';
import { Network, getNetworkEndpoints } from '@injectivelabs/networks';
import { ChainId } from '@injectivelabs/ts-types';
import { INJECTIVE_NETWORK, INJECTIVE_CHAIN_ID } from '@/lib/injective-wallet';

export const useInjective = () => {
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<number>(0);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [walletStrategy, setWalletStrategy] = useState<WalletStrategy | null>(null);

    // Initialize Wallet Strategy
    useEffect(() => {
        const endpoints = getNetworkEndpoints(INJECTIVE_NETWORK);
        const strategy = new WalletStrategy({
            chainId: INJECTIVE_CHAIN_ID as ChainId,
        });
        setWalletStrategy(strategy);
    }, []);

    const [transactions, setTransactions] = useState<any[]>([]);

    const fetchTransactions = useCallback(async (addr: string) => {
        try {
            const response = await fetch(`https://testnet.explorer.injective.network/api/v1/accounts/${addr}/transactions`);
            if (response.ok) {
                const data = await response.json();
                setTransactions(data.transactions || []);
            }
        } catch (e) {
            console.error("Failed to fetch transactions", e);
        }
    }, []);

    const fetchBalance = useCallback(async (addr: string) => {
        try {
            const response = await fetch(`https://testnet.lcd.injective.network/cosmos/bank/v1beta1/balances/${addr}/by_denom?denom=uinj`);
            if (response.ok) {
                const data = await response.json();
                const amount = data.balance?.amount || '0';
                setBalance(parseInt(amount) / 1e18);
            }
        } catch (e) {
            console.error("Failed to fetch balance", e);
        }
    }, []);

    const connect = async (wallet: Wallet = Wallet.Keplr) => {
        setError(null);
        setIsLoading(true);

        try {
            if (!walletStrategy) throw new Error("Wallet strategy not initialized");
            
            walletStrategy.setWallet(wallet);
            const addresses = await walletStrategy.getAddresses();
            
            if (addresses.length === 0) {
                throw new Error("No accounts found.");
            }
            
            const userAddress = addresses[0];
            setAddress(userAddress);
            setIsConnected(true);
            
            await fetchBalance(userAddress);
            await fetchTransactions(userAddress);
            return userAddress;

        } catch (err: any) {
            console.error("Injective Connection Error:", err);
            setError(err.message || "Failed to connect.");
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    const disconnect = useCallback(() => {
        setAddress(null);
        setBalance(0);
        setTransactions([]);
        setIsConnected(false);
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
