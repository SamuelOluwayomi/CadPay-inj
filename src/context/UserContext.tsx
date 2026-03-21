'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useInjective } from '@/hooks/useInjective';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export interface UserProfile {
    username: string;
    emoji: string | null;
    gender: string | null;
    pin: string;
    email?: string;
    authority: string; // Wallet address
    avatar_url?: string;
    encrypted_private_key?: string;
    auth_method?: 'password' | 'biometric';
}

interface UserContextType {
    profile: UserProfile | null;
    loading: boolean;
    error: string | null;
    session: Session | null;
    sessionInitialized: boolean;
    fetchProfile: () => Promise<void>;
    createProfile: (username: string, emoji: string, gender: string, pin: string, email?: string, avatar_url?: string) => Promise<any>;
    updateProfile: (username: string, emoji: string, gender: string, pin: string, email?: string, avatar_url?: string) => Promise<any>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const { address, isConnected } = useInjective();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [sessionInitialized, setSessionInitialized] = useState(false);

    // Initial Session Check
    useEffect(() => {
        const initSession = async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                setSession(currentSession);
            } catch (err) {
                console.error('🔍 [UserContext] getSession failed:', err);
            } finally {
                setSessionInitialized(true);
            }
        };
        initSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
            setSessionInitialized(true);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = useCallback(async () => {
        if (!sessionInitialized) return;

        setLoading(true);
        setError(null);

        try {
            let data, fetchError;

            if (session?.user) {
                const result = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .maybeSingle();
                data = result.data;
                fetchError = result.error;
            } else if (address) {
                const result = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('wallet_address', address)
                    .maybeSingle();
                data = result.data;
                fetchError = result.error;
            } else {
                setProfile(null);
                setLoading(false);
                return;
            }

            if (fetchError && fetchError.code !== 'PGRST116' && fetchError.code !== '406') {
                console.warn('🔍 [UserContext] Supabase fetch error:', fetchError);
                setError(fetchError.message);
            }

            if (data) {
                setProfile({
                    username: data.username,
                    emoji: data.emoji,
                    gender: data.gender,
                    pin: data.pin || '',
                    email: data.email || '',
                    authority: data.wallet_address || '',
                    avatar_url: data.avatar_url,
                    encrypted_private_key: data.encrypted_private_key,
                    auth_method: data.auth_method
                });

                if (data.wallet_address && address !== data.wallet_address) {
                    console.log('🔄 [UserContext] Identity mismatch: Syncing localStorage wallet');
                    localStorage.setItem('active_wallet_address', data.wallet_address);
                }
            } else {
                setProfile(null);
            }
        } catch (err: any) {
            console.error('🔍 [UserContext] Failed to fetch profile:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [address, session, sessionInitialized]);

    useEffect(() => {
        if (sessionInitialized) {
            fetchProfile();
        }
    }, [address, session, sessionInitialized, fetchProfile]);

    const createProfile = useCallback(async (username: string, emoji: string, gender: string, pin: string, email?: string, avatar_url?: string) => {
        setLoading(true);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error("You must be logged in to create a profile.");

            const updateData: any = {
                username,
                emoji,
                gender,
                pin,
                email,
                avatar_url,
                updated_at: new Date().toISOString()
            };

            if (address && !profile?.authority) {
                updateData.wallet_address = address;
            }

            const { data, error: updateError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', user.id)
                .select()
                .single();

            if (updateError) throw updateError;

            if (data) {
                setProfile({
                    username: data.username,
                    email: data.email,
                    emoji: data.emoji,
                    gender: data.gender,
                    pin: data.pin,
                    authority: data.wallet_address,
                    avatar_url: data.avatar_url,
                    encrypted_private_key: data.encrypted_private_key,
                    auth_method: data.auth_method
                });
            }
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [address, profile?.authority]);

    const updateProfile = useCallback(async (username: string, emoji: string, gender: string, pin: string, email?: string, avatar_url?: string) => {
        setLoading(true);
        try {
            const updates: any = {
                username, emoji, gender, pin, email, avatar_url,
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

            const { data, error: updateError } = await query.select().single();
            if (updateError) throw updateError;

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

    return (
        <UserContext.Provider value={{
            profile, loading, error, session, sessionInitialized,
            fetchProfile, createProfile, updateProfile
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
