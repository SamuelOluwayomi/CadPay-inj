'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

import { SERVICES } from '@/data/subscriptions';

export interface Merchant {
    id: string;
    name: string;
    email: string;
    password?: string; // Added password field
    walletPublicKey: string;
    walletSecretKey: string;
    joinedAt: Date;
}

export interface MerchantService {
    id: string;
    merchantId: string;
    name: string;
    description: string;
    price: number;
    icon: string; // url or icon name
    color: string;
}

interface MerchantContextType {
    merchant: Merchant | null;
    merchants: Merchant[];
    services: MerchantService[];
    createMerchant: (name: string, email: string, password?: string) => Promise<Merchant>;
    loginMerchant: (email: string, password?: string) => Promise<boolean>;
    logoutMerchant: () => void;
    createNewService: (name: string, price: number, description: string, color: string) => void;

    getMerchantServices: (merchantId: string) => MerchantService[];
    isLoading: boolean;
}

const MerchantContext = createContext<MerchantContextType | undefined>(undefined);

import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

export function MerchantProvider({ children }: { children: React.ReactNode }) {
    const { profile, loading: profileLoading } = useUser();

    const [merchantProfile, setMerchantProfile] = useState<Merchant | null>(null);
    const [services, setServices] = useState<MerchantService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // 1. Fetch Merchant Profile from Supabase
    useEffect(() => {
        const fetchMerchantProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setMerchantProfile(null);
                setIsLoading(false);
                return;
            }

            try {
                const { data: merchantData, error } = await supabase
                    .from('merchants')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                if (merchantData) {
                    setMerchantProfile({
                        id: merchantData.id,
                        name: merchantData.business_name,
                        email: merchantData.email,
                        walletPublicKey: merchantData.wallet_address,
                        walletSecretKey: merchantData.encrypted_private_key, 
                        joinedAt: new Date(merchantData.created_at)
                    });
                } else if (user.app_metadata?.provider === 'google' || user.user_metadata?.full_name) {
                    // AUTO-PROVISION for OAuth users if profile is missing
                    console.log("🛠️ Auto-provisioning merchant profile for OAuth user...");
                    const businessName = user.user_metadata?.business_name || user.user_metadata?.full_name || "New Merchant";
                    
                    const response = await fetch('/api/merchant/wallet/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: user.id,
                            businessName: businessName,
                            email: user.email,
                            authMethod: 'google'
                        })
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        setMerchantProfile({
                            id: user.id,
                            name: businessName,
                            email: user.email!,
                            walletPublicKey: result.address,
                            walletSecretKey: '',
                            joinedAt: new Date()
                        });
                    }
                }
            } catch (err) {
                console.error('Error fetching merchant profile:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMerchantProfile();
    }, [profile?.id, refreshTrigger]);

    // Derived Merchant State
    const merchant = React.useMemo(() => {
        if (merchantProfile) return merchantProfile;

        // Fallback to demo mode
        if (typeof window !== 'undefined') {
            const isDemoMode = localStorage.getItem('demo_mode') === 'true';
            if (isDemoMode) {
                const demoMerchant = localStorage.getItem('demo_merchant');
                if (demoMerchant) return JSON.parse(demoMerchant);
            }
        }
        return null;
    }, [merchantProfile, refreshTrigger]);

    // Seed Services
    useEffect(() => {
        const loadServices = () => {
            if (!merchant) {
                setIsLoading(false);
                return;
            }

            try {
                const storedServices = localStorage.getItem('cadpay_services');
                let currentServices = storedServices ? JSON.parse(storedServices) : [];
                const ADMIN_KEY = "inj1n38re8nhlhns6ka3kqryr2e2tlqau3fwmsp6te";

                if (merchant.walletPublicKey === ADMIN_KEY) {
                    const adminServices = currentServices.filter((s: MerchantService) => s.merchantId === merchant.id);
                    if (adminServices.length === 0) {
                        const seedServices = SERVICES.map(s => ({
                            id: s.id,
                            merchantId: merchant.id,
                            name: s.name,
                            description: s.description,
                            price: s.plans[0].priceUSD,
                            icon: s.id,
                            color: s.color
                        }));
                        currentServices = [...currentServices, ...seedServices];
                        localStorage.setItem('cadpay_services', JSON.stringify(currentServices));
                    }
                }
                setServices(currentServices);
            } catch (e) {
                console.error("Failed to load services", e);
            } finally {
                setIsLoading(false);
            }
        };

        loadServices();
    }, [merchant?.id]);

    const createMerchant = async (name: string, email: string, password?: string) => {
        setIsLoading(true);
        try {
            // 1. Create Supabase Auth Account
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password: password || 'merchant-secret-123',
                options: {
                    data: { business_name: name, role: 'merchant' }
                }
            });

            if (authError || !authData.user) throw authError || new Error("Auth failed");

            // 2. Call API to generate Wallet and create Merchant Profile
            const response = await fetch('/api/merchant/wallet/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: authData.user.id,
                    businessName: name,
                    email: email,
                    authMethod: 'password'
                })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            // 3. Update local state
            setRefreshTrigger(prev => prev + 1);
            
            return {
                id: authData.user.id,
                name,
                email,
                walletPublicKey: result.address,
                walletSecretKey: '',
                joinedAt: new Date()
            };
        } catch (e: any) {
            console.error('Merchant Registration Error:', e);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    const loginMerchant = async (email: string, password?: string) => {
        if (email === 'demo@cadpay.xyz' && password === 'demo123') {
            const demoMerchant = {
                id: 'demo-admin',
                name: 'Admin 01',
                email: 'demo@cadpay.xyz',
                walletPublicKey: 'inj1n38re8nhlhns6ka3kqryr2e2tlqau3fwmsp6te',
                walletSecretKey: '',
                joinedAt: new Date(),
                password: 'demo123'
            };
            localStorage.setItem('demo_merchant', JSON.stringify(demoMerchant));
            localStorage.setItem('demo_mode', 'true');
            setRefreshTrigger(prev => prev + 1);
            return true;
        }
        return false;
    };

    const logoutMerchant = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('demo_mode');
        localStorage.removeItem('demo_merchant');
        localStorage.removeItem('active_wallet_address');
        window.location.href = '/';
    };

    const createNewService = (name: string, price: number, description: string, color: string) => {
        if (!merchant) return;
        const newService: MerchantService = {
            id: crypto.randomUUID(),
            merchantId: merchant.id,
            name,
            price,
            description,
            icon: 'Storefront',
            color
        };
        const updatedServices = [...services, newService];
        setServices(updatedServices);
        localStorage.setItem('cadpay_services', JSON.stringify(updatedServices));
    };

    const getMerchantServices = (merchantId: string) => {
        return services.filter(s => s.merchantId === merchantId);
    };

    return (
        <MerchantContext.Provider value={{
            merchant,
            merchants: [],
            services,
            createMerchant,
            loginMerchant,
            logoutMerchant,
            createNewService,
            getMerchantServices,
            isLoading: profileLoading || isLoading
        }}>
            {children}
        </MerchantContext.Provider>
    );
}

export function useMerchant() {
    const context = useContext(MerchantContext);
    if (context === undefined) {
        throw new Error('useMerchant must be used within a MerchantProvider');
    }
    return context;
}
