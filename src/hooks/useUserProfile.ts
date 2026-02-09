
import { useEffect, useState, useCallback } from 'react';
import { useKasWare } from '@/hooks/useKasWare';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
    username: string;
    emoji: string;
    gender: string;
    pin: string;
    email?: string;
    authority: string; // Wallet address
}

export function useUserProfile() {
    const { address, isConnected } = useKasWare();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = useCallback(async () => {
        if (!address) {
            setProfile(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('wallet_address', address)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
                console.warn('Supabase fetch error:', error);
            }

            if (data) {
                setProfile({
                    username: data.username,
                    emoji: data.emoji || '👤',
                    gender: data.gender || 'other',
                    pin: data.pin || '',
                    email: data.email || '',
                    authority: data.wallet_address
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
    }, [address]);

    // Initial fetch and Real-time subscription
    useEffect(() => {
        fetchProfile();

        if (!address) return;

        // Subscribe to real-time changes
        const channel = supabase
            .channel(`profile_changes_${address}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: `wallet_address=eq.${address}`
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
    }, [address, fetchProfile]);

    const createProfile = useCallback(async (username: string, emoji: string, gender: string, pin: string, email?: string) => {
        if (!address) return null;
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from('profiles')
                .insert([
                    {
                        wallet_address: address,
                        username,
                        emoji,
                        gender,
                        pin,
                        email,
                        created_at: new Date().toISOString()
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            // Optimistic update
            setProfile({
                username: data.username,
                emoji: data.emoji || '👤',
                gender: data.gender || 'other',
                pin: data.pin || '',
                email: data.email || '',
                authority: data.wallet_address
            });

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
        if (!address) return null;
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from('profiles')
                .update({
                    username,
                    emoji,
                    gender,
                    pin,
                    email,
                    updated_at: new Date().toISOString()
                })
                .eq('wallet_address', address)
                .select()
                .single();

            if (error) throw error;

            // Optimistic update
            setProfile({
                username: data.username,
                emoji: data.emoji || '👤',
                gender: data.gender || 'other',
                pin: data.pin || '',
                email: data.email || '',
                authority: data.wallet_address
            });

            return data;
        } catch (err: any) {
            console.error('Error updating profile:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [address]);

    return {
        profile,
        loading,
        error,
        createProfile,
        updateProfile,
        fetchProfile
    };
}
