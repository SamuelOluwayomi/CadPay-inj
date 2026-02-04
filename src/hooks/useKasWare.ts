'use client';

import { useState, useEffect, useCallback } from 'react';

export const useKasWare = () => {
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<number>(0);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Check if KasWare is installed
    const checkKasWare = () => {
        if (typeof window === 'undefined') return false;
        return !!window.kasware;
    };

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

            // 3. Get Balance (Optional but nice)
            const balanceData = await window.kasware!.getBalance();

            setAddress(userAddress);
            setBalance(balanceData.total / 100000000); // Convert from Sompi to KAS
            setIsConnected(true);

            return userAddress;

        } catch (err: any) {
            console.error("KasWare Connection Error:", err);
            // Only show error text if it's not the user cancelling
            if (!err.message?.includes("User rejected")) {
                setError(err.message || "Failed to connect.");
            }
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-connect if already trusted OR use Local Wallet
    useEffect(() => {
        const attemptReconnect = async () => {
            let foundWallet = false;

            // 1. Try KasWare Extension
            if (checkKasWare()) {
                try {
                    const accounts = await window.kasware!.getAccounts();
                    if (accounts.length > 0) {
                        // Check network silently
                        const network = await window.kasware!.getNetwork();
                        if (network === 'testnet-10') {
                            setAddress(accounts[0]);
                            setIsConnected(true);
                            window.kasware!.getBalance().then(b => setBalance(b.total / 100000000));
                            foundWallet = true;
                        }
                    }
                } catch (e) {
                    console.warn("KasWare silent connect failed", e);
                }
            }

            // 2. Fallback to Local/Biometric Wallet
            if (!foundWallet) {
                const localAddress = localStorage.getItem('active_wallet_address');
                if (localAddress) {
                    setAddress(localAddress);
                    setIsConnected(true);

                    // Fetch Demo Balance
                    const localBalance = localStorage.getItem('demo_balance');
                    if (localBalance) {
                        setBalance(parseFloat(localBalance));
                    } else {
                        setBalance(0);
                    }
                }
            }
        };
        attemptReconnect();
    }, []);

    return {
        address,
        balance,
        isConnected,
        error,
        isLoading,
        connect
    };
};
