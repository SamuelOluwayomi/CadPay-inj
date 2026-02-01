import { useEffect, useState, useRef } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { CADPAY_MINT, TOKEN_PROGRAM_ID } from '../utils/cadpayToken';

// Use retry mechanism for connection creation
import { createConnectionWithRetry } from '../utils/rpc';

// Create connection lazily to handle RPC failures
let connectionInstance: Connection | null = null;

async function getConnection(): Promise<Connection> {
    if (!connectionInstance) {
        // #region agent log
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';
        
        // #endregion
        connectionInstance = await createConnectionWithRetry();
    }
    return connectionInstance;
}

export function useUSDCBalance(walletAddress: string | null) {
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(false);
    const [tokenAccount, setTokenAccount] = useState<PublicKey | null>(null);
    const subscriptionIdRef = useRef<number | null>(null);
    const isSubscribedRef = useRef(false);

    const fetchBalance = async () => {
        if (!walletAddress) {
            setBalance(0);
            setTokenAccount(null);
            return;
        }

        setLoading(true);
        // #region agent log
        
        // #endregion
        try {
            const walletPubkey = new PublicKey(walletAddress);
            const conn = await getConnection();

            // Get the associated token account address using SPL Token library
            const ata = await getAssociatedTokenAddress(
                CADPAY_MINT,
                walletPubkey,
                true, // allowOwnerOffCurve for smart wallets
                TOKEN_PROGRAM_ID
            );
            setTokenAccount(ata);
            // #region agent log
            
            // #endregion

            try {
                // Use getTokenAccountBalance for more reliable balance fetching
                const balanceResponse = await conn.getTokenAccountBalance(ata);
                const usdcBalance = balanceResponse.value.uiAmount || 0;
                // #region agent log
                
                // #endregion
                // Removed console.log for cleaner console output
                setBalance(usdcBalance);
            } catch (e: any) {
                // Account doesn't exist or error fetching
                // #region agent log
                
                // #endregion
                setBalance(0);
            }
        } catch (error: any) {
            console.error('Error fetching USDC balance:', error);
            // #region agent log
            
            // #endregion
            setBalance(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!walletAddress) {
            setBalance(0);
            setTokenAccount(null);
            return;
        }

        // Initial fetch
        fetchBalance();

        // Set up real-time account change notifications
        let subscriptionId: number | null = null;
        const setupAccountSubscription = async () => {
            try {
                const walletPubkey = new PublicKey(walletAddress);
                const conn = await getConnection();
                const ata = await getAssociatedTokenAddress(
                    CADPAY_MINT,
                    walletPubkey,
                    true,
                    TOKEN_PROGRAM_ID
                );

                // Subscribe to account changes for real-time balance updates
                subscriptionId = conn.onAccountChange(
                    ata,
                    (accountInfo) => {
                        // #region agent log
                        
                        // #endregion
                        // Immediately fetch updated balance when account changes
                        fetchBalance();
                    },
                    'confirmed'
                );
                subscriptionIdRef.current = subscriptionId;
                isSubscribedRef.current = true;
            } catch (error) {
                console.error('Failed to set up account subscription:', error);
                // Fallback to polling if subscription fails
            }
        };

        setupAccountSubscription();

        // Fallback polling every 3 seconds (faster than before) in case subscription fails
        const interval = setInterval(fetchBalance, 3000);

        return () => {
            // Cleanup: remove subscription and interval
            if (subscriptionIdRef.current !== null) {
                (async () => {
                    try {
                        const conn = await getConnection();
                        conn.removeAccountChangeListener(subscriptionIdRef.current!);
                    } catch (e) {
                        console.error('Error removing account subscription:', e);
                    }
                    subscriptionIdRef.current = null;
                    isSubscribedRef.current = false;
                })();
            }
            clearInterval(interval);
        };
    }, [walletAddress]);

    return { balance, loading, tokenAccount, refetch: fetchBalance };
}
