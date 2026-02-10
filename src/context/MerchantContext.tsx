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

import { useUserProfile } from '@/hooks/useUserProfile';

export function MerchantProvider({ children }: { children: React.ReactNode }) {
    // 1. New On-Chain Hook
    const { profile, loading: profileLoading, createProfile } = useUserProfile();

    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const [services, setServices] = useState<MerchantService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Derived Merchant State from On-Chain Profile or Demo Mode
    const merchant = React.useMemo(() => {
        // Check for demo mode first (client-side only)
        if (typeof window !== 'undefined') {
            const isDemoMode = localStorage.getItem('demo_mode') === 'true';
            if (isDemoMode) {
                const demoMerchant = localStorage.getItem('demo_merchant');
                if (demoMerchant) {
                    return JSON.parse(demoMerchant);
                }
            }
        }

        // Otherwise use on-chain profile
        if (!profile) return null;
        return {
            id: profile.authority,
            name: profile.username || 'Merchant',
            email: 'onchain@cadpay.xyz',
            walletPublicKey: profile.authority,
            walletSecretKey: '',
            joinedAt: new Date(),
            password: ''
        };
    }, [profile, refreshTrigger]);

    // Seed Services if none exist for this merchant
    useEffect(() => {
        if (!merchant) return;

        const loadServices = () => {
            try {
                const storedServices = localStorage.getItem('cadpay_services');
                let currentServices = storedServices ? JSON.parse(storedServices) : [];

                // If it's the specific "Admin 01" demo account (identified by ID or Key), seed default services
                // For hackathon: checks if it matches our hardcoded admin key
                const ADMIN_KEY = "kaspatest:qzrr3jngvdkh4pupuqn0y2rrwg5x9g2tlwshygsql4d8vekc0nnewcec5rjay";

                if (merchant.walletPublicKey === ADMIN_KEY) {
                    // Check if services already seeded
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
            }
            setIsLoading(false);
        };

        loadServices();
    }, [merchant?.id]);


    // Combined Loading State
    const combinedLoading = profileLoading || isLoading;

    // --- Legacy Functions Adapter (Keep types compatible) ---
    const createMerchant = async (name: string, email: string, password?: string) => {
        try {
            await createProfile(name, "merchant-emoji", "other", "0000");
            return {
                id: "pending",
                name,
                email,
                walletPublicKey: "",
                walletSecretKey: "",
                joinedAt: new Date()
            };
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const loginMerchant = async (email: string, password?: string) => {
        // Check for demo admin account
        if (email === 'demo@cadpay.xyz' && password === 'demo123') {
            // Create a demo merchant profile locally
            const demoMerchant = {
                id: 'demo-admin',
                name: 'Admin 01',
                email: 'demo@cadpay.xyz',
                walletPublicKey: 'kaspatest:qzrr3jngvdkh4pupuqn0y2rrwg5x9g2tlwshygsql4d8vekc0nnewcec5rjay',
                walletSecretKey: '',
                joinedAt: new Date(),
                password: 'demo123'
            };

            // Store in localStorage to persist demo login
            localStorage.setItem('demo_merchant', JSON.stringify(demoMerchant));
            localStorage.setItem('demo_mode', 'true');

            // Trigger re-render to pick up demo merchant
            setRefreshTrigger(prev => prev + 1);

            return true;
        }

        // For real merchant accounts, check if profile exists
        return !!merchant;
    };

    const logoutMerchant = () => {
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
            merchants: [], // Deprecated
            services,
            createMerchant,
            loginMerchant,
            logoutMerchant,
            createNewService,
            getMerchantServices,
            isLoading: combinedLoading
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
