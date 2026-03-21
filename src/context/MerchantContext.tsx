'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

import { SERVICES } from '@/data/subscriptions';

export interface MerchantProfile {
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
    category: string;
    description: string;
    imageUrl?: string;
    color: string;
    merchantWallet?: string;
    priceBasic: number;
    pricePro: number;
    priceEnterprise: number;
    featuresBasic: string[];
    featuresPro: string[];
    featuresEnterprise: string[];
}

export interface UserSubscription {
    id: string;
    userId: string;
    merchantId: string | null;
    serviceId: string;
    serviceName: string;
    planName: string;
    priceUsd: number;
    priceInj: number | null;
    status: 'active' | 'expired' | 'canceled';
    nextBillingDate: string;
    createdAt: string;
}

interface MerchantContextType {
    merchant: MerchantProfile | null;
    services: MerchantService[];
    publicServices: MerchantService[];
    subscriptions: UserSubscription[];
    createMerchant: (name: string, email: string, password?: string) => Promise<MerchantProfile>;
    loginMerchant: (email: string, password?: string) => Promise<boolean>;
    logoutMerchant: () => Promise<void>;
    createNewService: (serviceData: Partial<MerchantService>) => Promise<boolean>;
    subscribeToService: (subscriptionData: any) => Promise<boolean>;
    getMerchantServices: (merchantId: string) => MerchantService[];
    fetchPublicServices: () => Promise<void>;
    isLoading: boolean;
}

const MerchantContext = createContext<MerchantContextType | undefined>(undefined);

import { useUser } from '@/context/UserContext';
import { merchantSupabase as supabase } from '@/lib/supabase';

export function MerchantProvider({ children }: { children: React.ReactNode }) {
    const { profile, loading: profileLoading } = useUser();

    const [merchantProfile, setMerchantProfile] = useState<MerchantProfile | null>(null);
    const [services, setServices] = useState<MerchantService[]>([]);
    const [publicServices, setPublicServices] = useState<MerchantService[]>([]);
    const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
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
                } else if (user) {
                    // Auto-generate merchant profile (they logged in via Google Auth)
                    const tempName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'My Business';
                    const response = await fetch('/api/merchant/wallet/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: user.id,
                            businessName: tempName,
                            email: user.email,
                            authMethod: 'google'
                        })
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        setMerchantProfile({
                            id: user.id,
                            name: tempName,
                            email: user.email || '',
                            walletPublicKey: result.address,
                            walletSecretKey: '',
                            joinedAt: new Date()
                        });
                    } else {
                        setMerchantProfile(null);
                    }
                }
            } catch (err) {
                console.error('Error fetching merchant profile:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMerchantProfile();
    }, [refreshTrigger]);

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
        const loadMerchantData = async () => {
            if (!merchant?.id) return;
            setIsLoading(true);
            try {
                // 1. Load Services from DB
                const sResponse = await fetch(`/api/merchant/services?merchantId=${merchant.id}`);
                if (sResponse.ok) {
                    const sData = await sResponse.json();
                    setServices(sData.map((s: any) => ({
                        id: s.id,
                        merchantId: s.merchant_id,
                        name: s.name,
                        category: s.category,
                        description: s.description,
                        imageUrl: s.image_url,
                        color: s.color,
                        merchantWallet: s.merchant_wallet,
                        priceBasic: parseFloat(s.price_basic),
                        pricePro: parseFloat(s.price_pro),
                        priceEnterprise: parseFloat(s.price_enterprise),
                        featuresBasic: s.features_basic,
                        featuresPro: s.features_pro,
                        featuresEnterprise: s.features_enterprise
                    })));
                }

                // 2. Load Subscriptions (including hardcoded ones if this is admin)
                const subUrl = merchant.id === 'demo-admin' 
                    ? `/api/subscriptions?merchantId=admin` // Placeholder for admin logic
                    : `/api/subscriptions?merchantId=${merchant.id}`;
                
                const subResponse = await fetch(subUrl);
                if (subResponse.ok) {
                    const subData = await subResponse.json();
                    setSubscriptions(subData.map((sub: any) => ({
                        id: sub.id,
                        userId: sub.user_id,
                        merchantId: sub.merchant_id,
                        serviceId: sub.service_id,
                        serviceName: sub.service_name,
                        planName: sub.plan_name,
                        priceUsd: parseFloat(sub.price_usd),
                        priceInj: sub.price_inj ? parseFloat(sub.price_inj) : null,
                        status: sub.status,
                        nextBillingDate: sub.next_billing_date,
                        createdAt: sub.created_at
                    })));
                }
            } catch (e) {
                console.error("Failed to load merchant data", e);
            } finally {
                setIsLoading(false);
            }
        };

        loadMerchantData();
    }, [merchant?.id, refreshTrigger]);

    const fetchPublicServices = async () => {
        try {
            const response = await fetch('/api/merchant/services');
            if (response.ok) {
                const data = await response.json();
                setPublicServices(data.map((s: any) => ({
                    id: s.id,
                    merchantId: s.merchant_id,
                    name: s.name,
                    category: s.category,
                    description: s.description,
                    imageUrl: s.image_url,
                    color: s.color,
                    merchantWallet: s.merchant_wallet,
                    priceBasic: parseFloat(s.price_basic),
                    pricePro: parseFloat(s.price_pro),
                    priceEnterprise: parseFloat(s.price_enterprise),
                    featuresBasic: s.features_basic,
                    featuresPro: s.features_pro,
                    featuresEnterprise: s.features_enterprise
                })));
            }
        } catch (e) {
            console.error("Failed to fetch public services", e);
        }
    };

    // Auto-fetch public services for users
    useEffect(() => {
        fetchPublicServices();
    }, []);

    const createMerchant = async (name: string, email: string, password?: string): Promise<MerchantProfile> => {
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

            if (!response.ok) throw new Error("Failed to create merchant profile");
            
            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            // 3. Update local state and return the new merchant profile
            setRefreshTrigger(prev => prev + 1);
            
            return {
                id: authData.user.id,
                name,
                email,
                walletPublicKey: result.address,
                walletSecretKey: '', // Wallet secret key is not returned for security
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

    const createNewService = async (serviceData: Partial<MerchantService>) => {
        if (!merchant) return false;
        try {
            const response = await fetch('/api/merchant/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchantId: merchant.id,
                    ...serviceData
                })
            });

            if (response.ok) {
                setRefreshTrigger(prev => prev + 1);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Failed to create service", e);
            return false;
        }
    };

    const getMerchantServices = (merchantId: string) => {
        return services.filter(s => s.merchantId === merchantId);
    };

    const subscribeToService = async (subscriptionData: any) => {
        try {
            const response = await fetch('/api/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscriptionData)
            });
            return response.ok;
        } catch (e) {
            console.error("Failed to subscribe", e);
            return false;
        }
    };

    return (
        <MerchantContext.Provider value={{
            merchant,
            services,
            publicServices,
            subscriptions,
            createMerchant,
            loginMerchant,
            logoutMerchant,
            createNewService,
            subscribeToService,
            getMerchantServices,
            fetchPublicServices,
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
