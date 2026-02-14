import { useEffect, useState, useCallback } from 'react';
import { useKasWare } from '@/hooks/useKasWare';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export interface UserProfile {
    username: string;
    emoji: string;
    gender: string;
    pin: string;
    email?: string;
    authority: string; // Wallet address
    encrypted_private_key?: string; // New field for custodial check
}

export function useUserProfile() {
    const { address, isConnected } = useKasWare();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<Session | null>(null);

    // Initial Session Check
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            let data, error;

            // Strategy: Prioritize Supabase Session (Custodial), Fallback to KasWare (Non-Custodial)
            if (session?.user) {
                // Fetch by User ID
                const result = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                data = result.data;
                error = result.error;
            } else if (address) {
                // Fetch by Wallet Address (Non-Custodial / KasWare detected)
                const result = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('wallet_address', address)
                    .maybeSingle();

                // CRITICAL: If no profile found for this address, do NOT use it?
                // Or allows transient usage?
                data = result.data;
                error = result.error;
            } else {
                setProfile(null);
                setLoading(false);
                return;
            }

            if (error && error.code !== 'PGRST116' && error.code !== '406') {
                console.warn('Supabase fetch error:', error);
            }

            if (data) {
                setProfile({
                    username: data.username,
                    emoji: data.emoji || '👤',
                    gender: data.gender || 'other',
                    pin: data.pin || '',
                    email: data.email || '',
                    authority: data.wallet_address,
                    encrypted_private_key: data.encrypted_private_key
                });
            } else {
                setProfile(null);
            }
        } catch (err: any) {
            console.error('Failed to fetch profile:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [address, session]);

    // Auto-create wallet when profile loads
    useEffect(() => {
        const initWallet = async () => {
            if (session?.user?.id && profile && !profile.encrypted_private_key) {
                // Avoid depending on 'checkOrCreateWallet' function identity
                // Logic moved inside to break dependency chain
                const { data: latestProfile } = await supabase
                    .from('profiles')
                    .select('wallet_address, encrypted_private_key')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (latestProfile?.wallet_address && latestProfile?.encrypted_private_key) {
                    if (profile.authority !== latestProfile.wallet_address) {
                        fetchProfile();
                    }
                    return;
                }

                try {
                    const res = await fetch('/api/wallet/create', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        }
                    });
                    const data = await res.json();
                    if (data.success) {
                        fetchProfile();
                    }
                } catch (e) {
                    console.error('Wallet creation error:', e);
                }
            }
        };

        initWallet();
    }, [session, profile?.encrypted_private_key, fetchProfile]); // Only depend on the specific field we check

    const createProfile = useCallback(async (username: string, emoji: string, gender: string, pin: string, email?: string) => {
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

            if (error) throw error;

            // Optimistic update
            if (data) {
                setProfile({
                    username: data.username,
                    email: data.email,
                    emoji: data.emoji,
                    gender: data.gender,
                    pin: data.pin,
                    authority: data.wallet_address,
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

    const updateProfile = useCallback(async (username: string, emoji: string, gender: string, pin: string, email?: string) => {
        setLoading(true);
        setError(null);

        try {
            const updates: any = {
                username,
                emoji,
                gender,
                pin,
                email,
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
        session
    };
}
