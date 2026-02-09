import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { verifyPassword } from '@/utils/passwordHash';
import { useBiometricWallet } from './useBiometricWallet';

interface SignInResult {
    success: boolean;
    walletAddress?: string;
    error?: string;
}

export function useAuth() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { unlockWallet, unlockWalletWithPassword } = useBiometricWallet();

    /**
     * Sign in with email and password
     */
    const signInWithPassword = async (email: string, password: string): Promise<SignInResult> => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Fetch credentials from Supabase
            const { data, error: fetchError } = await supabase
                .from('user_credentials')
                .select('wallet_address, password_hash, auth_method')
                .eq('email', email)
                .single();

            if (fetchError || !data) {
                setError('Invalid email or password');
                return { success: false, error: 'Invalid email or password' };
            }

            // 2. Verify auth method
            if (data.auth_method !== 'password') {
                setError('This account uses biometric authentication');
                return { success: false, error: 'This account uses biometric authentication' };
            }

            // 3. Verify password
            if (!data.password_hash) {
                setError('Account configuration error');
                return { success: false, error: 'Account configuration error' };
            }

            const isValid = await verifyPassword(password, data.password_hash);
            if (!isValid) {
                setError('Invalid email or password');
                return { success: false, error: 'Invalid email or password' };
            }

            // 4. Update last login
            await supabase
                .from('user_credentials')
                .update({ last_login: new Date().toISOString() })
                .eq('email', email);

            // 5. Unlock wallet from IndexedDB using password
            const unlockResult = await unlockWalletWithPassword(email, password);
            if (!unlockResult.success || !unlockResult.mnemonic) {
                setError(unlockResult.error || 'Failed to unlock wallet');
                return { success: false, error: unlockResult.error || 'Failed to unlock wallet' };
            }

            // 6. Set active session
            localStorage.setItem('active_wallet_address', data.wallet_address);
            localStorage.setItem('auth_email', email);

            return { success: true, walletAddress: data.wallet_address };
        } catch (err: any) {
            console.error('Sign in error:', err);
            const errorMsg = err.message || 'Sign in failed';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Sign in with email and biometric authentication
     */
    const signInWithBiometric = async (email: string): Promise<SignInResult> => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Fetch credentials from Supabase
            const { data, error: fetchError } = await supabase
                .from('user_credentials')
                .select('wallet_address, auth_method')
                .eq('email', email)
                .single();

            if (fetchError || !data) {
                setError('Account not found');
                return { success: false, error: 'Account not found' };
            }

            // 2. Verify auth method
            if (data.auth_method !== 'biometric') {
                setError('This account uses password authentication');
                return { success: false, error: 'This account uses password authentication' };
            }

            // 3. Unlock wallet from IndexedDB using biometric
            const unlockResult = await unlockWallet(email);
            if (!unlockResult.success || !unlockResult.mnemonic) {
                setError(unlockResult.error || 'Biometric authentication failed');
                return { success: false, error: unlockResult.error || 'Biometric authentication failed' };
            }

            // 4. Update last login
            await supabase
                .from('user_credentials')
                .update({ last_login: new Date().toISOString() })
                .eq('email', email);

            // 5. Set active session
            localStorage.setItem('active_wallet_address', data.wallet_address);
            localStorage.setItem('auth_email', email);

            return { success: true, walletAddress: data.wallet_address };
        } catch (err: any) {
            console.error('Biometric sign in error:', err);
            const errorMsg = err.message || 'Biometric sign in failed';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Sign out
     */
    const signOut = () => {
        localStorage.removeItem('active_wallet_address');
        localStorage.removeItem('auth_email');
        setError(null);
    };

    /**
     * Check if user has an account with given email
     */
    const checkEmailExists = async (email: string): Promise<{ exists: boolean; authMethod?: 'password' | 'biometric' }> => {
        try {
            const { data, error } = await supabase
                .from('user_credentials')
                .select('auth_method')
                .eq('email', email)
                .single();

            if (error || !data) {
                return { exists: false };
            }

            return { exists: true, authMethod: data.auth_method as 'password' | 'biometric' };
        } catch (err) {
            return { exists: false };
        }
    };

    /**
     * Get user's wallet address from Supabase (for recovery validation)
     */
    const getWalletAddress = async (email: string): Promise<string | null> => {
        try {
            const { data, error } = await supabase
                .from('user_credentials')
                .select('wallet_address')
                .eq('email', email)
                .single();

            if (error || !data) {
                return null;
            }

            return data.wallet_address;
        } catch (err) {
            return null;
        }
    };

    const clearError = () => setError(null);

    return {
        signInWithPassword,
        signInWithBiometric,
        signOut,
        checkEmailExists,
        getWalletAddress,
        clearError,
        isLoading,
        error
    };
}
