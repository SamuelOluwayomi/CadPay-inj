import { useState } from 'react';
import { supabase } from '@/lib/supabase';
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

    const signInWithPassword = async (email: string, password: string): Promise<SignInResult> => {
        setIsLoading(true);
        setError(null);
        console.log('🔑 [useAuth] Attempting signInWithPassword for:', email);

        try {
            // 1. Authenticate with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError || !authData.user) {
                console.warn('🔑 [useAuth] Supabase Auth Error:', authError?.message);
                const msg = authError?.message || 'Invalid email or password';
                setError(msg);
                return { success: false, error: msg };
            }

            console.log('🔑 [useAuth] Auth successful, fetching profile...');
            // 2. Now authenticated — fetch profile (RLS will pass)
            const { data: profile } = await supabase
                .from('profiles')
                .select('wallet_address, auth_method')
                .eq('id', authData.user.id)
                .maybeSingle();

            if (profile?.auth_method === 'biometric') {
                console.warn('🔑 [useAuth] Account is biometric, signing out...');
                await supabase.auth.signOut();
                setError('This account uses biometric authentication');
                return { success: false, error: 'This account uses biometric authentication' };
            }

            // 3. Unlock IndexedDB wallet with password
            console.log('🔑 [useAuth] Unlocking local wallet...');
            const unlockResult = await unlockWalletWithPassword(email, password);
            if (!unlockResult.success || !unlockResult.mnemonic) {
                console.warn('🔑 [useAuth] IndexedDB wallet unlock failed (non-fatal):', unlockResult.error);
            }

            const walletAddress = profile?.wallet_address || '';
            console.log('🔑 [useAuth] Login complete. Wallet:', walletAddress);
            localStorage.setItem('active_wallet_address', walletAddress);
            localStorage.setItem('auth_email', email);

            return { success: true, walletAddress };
        } catch (err: any) {
            console.error('🔑 [useAuth] Sign in catch error:', err);
            const errorMsg = err.message || 'Sign in failed';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Sign in with email and biometric authentication.
     */
    const signInWithBiometric = async (email: string): Promise<SignInResult> => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Unlock wallet from IndexedDB (needs to happen before we know the auth password)
            const unlockResult = await unlockWallet(email);
            if (!unlockResult.success || !unlockResult.mnemonic) {
                setError(unlockResult.error || 'Biometric authentication failed');
                return { success: false, error: unlockResult.error || 'Biometric authentication failed' };
            }

            // 2. Derive the deterministic password used at signup for biometric users
            const cachedAddress = localStorage.getItem('active_wallet_address');
            let walletAddress = cachedAddress || '';

            // 3. Try signing in with Supabase auth using derived password
            if (walletAddress) {
                const authPassword = walletAddress.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
                const { error: authSignInError } = await supabase.auth.signInWithPassword({
                    email,
                    password: authPassword
                });
                if (authSignInError) {
                    console.warn('Supabase Auth biometric signin warning:', authSignInError.message);
                }
            }

            // 4. After auth attempt, read profile (may succeed now if session was set)
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('wallet_address, auth_method')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profile?.auth_method === 'password') {
                    setError('This account uses password authentication');
                    return { success: false, error: 'This account uses password authentication' };
                }

                walletAddress = profile?.wallet_address || walletAddress;
            }

            localStorage.setItem('active_wallet_address', walletAddress);
            localStorage.setItem('auth_email', email);

            return { success: true, walletAddress };
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
    const signOut = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('active_wallet_address');
        localStorage.removeItem('auth_email');
        setError(null);
    };
    const checkEmailExists = async (email: string): Promise<{ exists: boolean; authMethod?: 'password' | 'biometric' }> => {
        try {
            // 1. Call the Security Definer RPC to get auth method
            // This is the ONLY safe way to check existence without clearing the session
            const { data, error } = await supabase.rpc('get_auth_method', { email_in: email });

            if (error) {
                console.error('🔑 [useAuth] RPC Error checking email:', error.message);
                // Fallback: If RPC fails, we can't reliably know if it exists or clear the session.
                // We return exists: true to allow a password attempt, but we DO NOT do a dummy login.
                return { exists: true, authMethod: 'password' };
            }

            if (!data) {
                console.log('🔑 [useAuth] No account found for:', email);
                return { exists: false };
            }

            return { exists: true, authMethod: data as 'password' | 'biometric' };
        } catch (err) {
            console.error('🔑 [useAuth] Unexpected error in checkEmailExists:', err);
            return { exists: false };
        }
    };

    /**
     * Get user's wallet address from Supabase (for recovery validation).
     * Only works when user is already authenticated.
     */
    const getWalletAddress = async (email: string): Promise<string | null> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('wallet_address')
                .eq('id', user.id)
                .maybeSingle();

            if (error || !data) return null;
            return data.wallet_address;
        } catch {
            return null;
        }
    };

    /**
     * Sign in with Injective wallet (Deterministic Auth)
     */
    const signInWithInjective = async (walletAddress: string): Promise<SignInResult> => {
        setIsLoading(true);
        setError(null);

        try {
            const email = `${walletAddress}@injective.cadpay.fi`;
            const password = `cadpay-sig-${walletAddress}`;

            // Try login first
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (signInError) {
                // Auto-register if not found
                console.log('Injective account not found, creating new...', signInError.message);
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { wallet_address: walletAddress, is_injective: true }
                    }
                });
                if (signUpError) throw signUpError;
            }

            localStorage.setItem('active_wallet_address', walletAddress);
            localStorage.setItem('auth_email', email);

            return { success: true, walletAddress };
        } catch (err: any) {
            console.error('Injective sign in error:', err);
            const errorMsg = err.message || 'Injective sign in failed';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        error,
        signInWithPassword,
        signInWithBiometric,
        signInWithInjective,
        signOut,
        checkEmailExists,
        getWalletAddress,
        clearError: () => setError(null)
    };
}
