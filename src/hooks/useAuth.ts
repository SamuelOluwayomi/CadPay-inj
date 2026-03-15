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

        try {
            // 1. Authenticate with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError || !authData.user) {
                const msg = authError?.message || 'Invalid email or password';
                setError(msg);
                return { success: false, error: msg };
            }

            // 2. Now authenticated — fetch profile (RLS will pass)
            const { data: profile } = await supabase
                .from('profiles')
                .select('wallet_address, auth_method')
                .eq('id', authData.user.id)
                .maybeSingle();

            if (profile?.auth_method === 'biometric') {
                await supabase.auth.signOut();
                setError('This account uses biometric authentication');
                return { success: false, error: 'This account uses biometric authentication' };
            }

            // 3. Unlock IndexedDB wallet with password
            const unlockResult = await unlockWalletWithPassword(email, password);
            if (!unlockResult.success || !unlockResult.mnemonic) {
                // Non-fatal: wallet may not be in IndexedDB (e.g. different device)
                console.warn('IndexedDB wallet unlock failed:', unlockResult.error);
            }

            const walletAddress = profile?.wallet_address || '';
            localStorage.setItem('active_wallet_address', walletAddress);
            localStorage.setItem('auth_email', email);

            return { success: true, walletAddress };
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
            // Attempt sign-in with a clearly wrong password
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password: '__cadpay_existence_check__'
            });

            if (!error) {
                // Extremely unlikely: somehow logged in — sign back out
                await supabase.auth.signOut();
                return { exists: true };
            }

            // "Invalid login credentials" → account exists, wrong password
            // "Email not confirmed" → account exists but unconfirmed
            // "User not found" / "No user found" → does NOT exist
            const msg = error.message.toLowerCase();
            const accountExists =
                msg.includes('invalid login credentials') ||
                msg.includes('email not confirmed') ||
                msg.includes('invalid credentials');

            if (!accountExists) {
                return { exists: false };
            }

            // Account exists — try to get auth_method from localStorage (cached from last login)
            // or default to 'password' since we can't safely query profiles without a session
            const cachedMethod = localStorage.getItem(`auth_method_${email}`) as 'password' | 'biometric' | null;
            return { exists: true, authMethod: cachedMethod || 'password' };
        } catch {
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
