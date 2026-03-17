import { useEffect, useState, useCallback } from 'react';
import { useInjective } from '@/hooks/useInjective';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export interface UserProfile {
    username: string;
    emoji: string;
    gender: string;
    pin: string;
    email?: string;
    authority: string; // Wallet address
    avatar_url?: string; // New field for Google profile picture
    encrypted_private_key?: string; // New field for custodial check
    auth_method?: 'password' | 'biometric';
}

export function useUserProfile() {
    const { address, isConnected } = useInjective();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [sessionInitialized, setSessionInitialized] = useState(false);

    // Initial Session Check
    useEffect(() => {
        const initSession = async () => {
            console.log('🔍 [useUserProfile] Initializing session...');
            try {
                const { data: { session } } = await supabase.auth.getSession();
                console.log('🔍 [useUserProfile] getSession result:', session ? 'Session found' : 'No session');
                setSession(session);
            } catch (err) {
                console.error('🔍 [useUserProfile] getSession failed:', err);
            } finally {
                setSessionInitialized(true);
            }
        };
        initSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log(`🔍 [useUserProfile] Auth state change Event: ${_event}`, session ? 'Session found' : 'No session');
            setSession(session);
            setSessionInitialized(true);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = useCallback(async () => {
        // block until session check is done
        if (!sessionInitialized) {
            console.log('🔍 [useUserProfile] fetchProfile blocked: session not initialized');
            return;
        }

        setLoading(true);
        setError(null);
        console.log('🔍 [useUserProfile] Starting fetchProfile...', { hasSession: !!session, address });

        try {
            let data, error;

            if (session?.user) {
                // 1. Prioritize Supabase Auth session (Email/Biometric login)
                const result = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .maybeSingle();
                data = result.data;
                error = result.error;
            } else if (address) {
                // 2. Fallback to Wallet Address (Injective Keplr/Leap login)
                const result = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('wallet_address', address)
                    .maybeSingle();
                data = result.data;
                error = result.error;
            } else {
                console.log('🔍 [useUserProfile] fetchProfile: No session OR address available');
                setProfile(null);
                setLoading(false);
                return;
            }

            if (error && error.code !== 'PGRST116' && error.code !== '406') {
                console.warn('🔍 [useUserProfile] Supabase fetch error:', error);
                setError(error.message);
            }

            if (data) {
                console.log('🔍 [useUserProfile] Profile data loaded successfully');
                setProfile({
                    username: data.username,
                    emoji: data.emoji || '👤',
                    gender: data.gender || 'other',
                    pin: data.pin || '',
                    email: data.email || '',
                    authority: data.wallet_address || '',
                    avatar_url: data.avatar_url,
                    encrypted_private_key: data.encrypted_private_key,
                    auth_method: data.auth_method
                });
            } else {
                console.log('🔍 [useUserProfile] No profile found in DB for user:', session?.user?.id || address);
                setProfile(null);
            }
        } catch (err: any) {
            console.error('🔍 [useUserProfile] Failed to fetch profile:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [address, session, sessionInitialized]);

    const checkOrCreateWallet = useCallback(async () => {
        if (!session?.access_token || !session?.user?.id) return;

        // 1. Double check DB state before acting
        const { data: latestProfile } = await supabase
            .from('profiles')
            .select('wallet_address, encrypted_private_key, auth_method')
            .eq('id', session.user.id)
            .maybeSingle();

        if (latestProfile?.auth_method === 'biometric') {
            // Do not overwrite biometric wallet
            if (latestProfile?.wallet_address) {
                console.log('✅ Biometric wallet detected:', latestProfile.wallet_address);
                if (profile?.authority !== latestProfile.wallet_address) {
                    fetchProfile();
                }
            } else {
                console.warn('⚠️ Biometric user has no wallet address yet. Waiting for client sync.');
            }
            return;
        }

        if (latestProfile?.wallet_address && latestProfile?.encrypted_private_key) {
            console.log('✅ Synced with DB Wallet:', latestProfile.wallet_address);
            // Ensure local state matches DB
            if (profile?.authority !== latestProfile.wallet_address) {
                fetchProfile();
            }
            return;
        }

        try {
            console.log('⚠️ No Custodial Wallet found. Requesting creation...');
            const res = await fetch('/api/wallet/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                console.log('🎉 Custodial wallet created:', data.address);
                fetchProfile(); // Refresh profile to get new wallet
            } else {
                console.error('Failed to create wallet:', data.error);
                setError(data.error);
            }
        } catch (e: any) {
            console.error('Wallet creation error:', e);
            setError(e.message);
        }
    }, [session, profile, fetchProfile]);

    // Auto-create wallet when profile loads
    useEffect(() => {
        if (session && profile && !profile.encrypted_private_key) {
            checkOrCreateWallet();
        }
    }, [session, profile, checkOrCreateWallet]);

    // Initial fetch and Real-time subscription
    useEffect(() => {
        if (!sessionInitialized) return; // Wait for auth check

        fetchProfile();

        const channelId = session?.user?.id || address;
        if (!channelId) return;

        const channel = supabase
            .channel(`profile_changes_${channelId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    // Filter depends on what we have. Ideally ID if session, else wallet_address.
                    filter: session?.user?.id ? `id=eq.${session.user.id}` : `wallet_address=eq.${address}`
                },
                (payload) => {
                    console.log('Real-time profile update received!', payload);
                    fetchProfile();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [address, session, fetchProfile, sessionInitialized]);

    const createProfile = useCallback(async (username: string, emoji: string, gender: string, pin: string, email?: string, avatar_url?: string) => {
        setLoading(true);
        setError(null);

        try {
            // 1. Ensure we have the latest authenticated user
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error("You must be logged in to create a profile.");
            }

            const newProfileData: any = {
                id: user.id, // Mandatory: Links to auth.users
                auth_user_id: user.id, // Redundant but requested in SQL schema
                username,
                emoji,
                gender,
                pin,
                email,
                avatar_url,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Optional: Link wallet address if available
            if (address) {
                newProfileData.wallet_address = address;
            }

            // Always upsert since ID is the primary key and matches auth ID
            const { data, error } = await supabase
                .from('profiles')
                .upsert(newProfileData)
                .select()
                .single();

            if (error) {
                console.error("❌ Profile Upsert Conflict/Error:", {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    data: newProfileData
                });
                throw error;
            }

            // Optimistic update
            if (data) {
                setProfile({
                    username: data.username,
                    email: data.email,
                    emoji: data.emoji,
                    gender: data.gender,
                    pin: data.pin,
                    authority: data.wallet_address,
                    avatar_url: data.avatar_url,
                    encrypted_private_key: data.encrypted_private_key
                });
            }

            return data;
        } catch (err: any) {
            console.error('Error creating profile:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [address]);

    const updateProfile = useCallback(async (username: string, emoji: string, gender: string, pin: string, email?: string, avatar_url?: string) => {
        setLoading(true);
        setError(null);

        try {
            const updates: any = {
                username,
                emoji,
                gender,
                pin,
                email,
                avatar_url,
                updated_at: new Date().toISOString()
            };

            let query = supabase.from('profiles').update(updates);

            if (session?.user?.id) {
                query = query.eq('id', session.user.id);
            } else if (address) {
                query = query.eq('wallet_address', address);
            } else {
                return null;
            }

            const { data, error } = await query.select().single();

            if (error) throw error;

            if (data) {
                setProfile(prev => prev ? ({ ...prev, ...updates }) : null);
            }
            return data;
        } catch (err: any) {
            console.error('Error updating profile:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [address, session]);

    return {
        profile,
        loading,
        error,
        createProfile,
        updateProfile,
        fetchProfile,
        session,
        sessionInitialized
    };
}
