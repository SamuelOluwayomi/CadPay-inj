'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

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

    // Derived Merchant State from On-Chain Profile
    const merchant = React.useMemo(() => {
        if (!profile) return null;
        return {
            id: profile.authority.toBase58(),
            name: profile.username || 'Merchant',
            email: 'onchain@cadpay.xyz', // Placeholder for layout compatibility
            walletPublicKey: profile.authority.toBase58(),
            walletSecretKey: '', // Not needed for on-chain auth
            joinedAt: new Date(),
            password: '' // Not needed
        };
    }, [profile]);

    // Seed Services if none exist for this merchant
    useEffect(() => {
        if (!merchant) return;

        const loadServices = () => {
            try {
                const storedServices = localStorage.getItem('cadpay_services');
                let currentServices = storedServices ? JSON.parse(storedServices) : [];

                // If it's the specific "Admin 01" demo account (identified by ID or Key), seed default services
                // For hackathon: checks if it matches our hardcoded admin key
                const ADMIN_KEY = "CqUmZNET15kK6qjNPrtPZdE3VUMem9ULtQ77GtVpUo1f";

                if (merchant.walletPublicKey === ADMIN_KEY) {
                    // Check if services already seeded
                    const adminServices = currentServices.filter((s: MerchantService) => s.merchantId === merchant.id);
                    if (adminServices.length === 0) {
                        const seedServices = SERVICES.map(s => ({
                            id: s.id,
                            merchantId: merchant.id,
                            name: s.name,
                            description: s.description,
                            price: s.plans[0].price,
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

    const loginMerchant = async () => {
        return !!merchant;
    };

    const logoutMerchant = () => {
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
