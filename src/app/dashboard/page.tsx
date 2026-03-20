'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    HouseIcon, UserCircleIcon, CreditCardIcon, PlusIcon, LinkIcon,
    ReceiptIcon, KeyIcon, SignOutIcon, CopyIcon, ArrowRightIcon, WalletIcon,
    CaretRightIcon, ListIcon, XIcon, CurrencyDollarIcon, ArrowUpIcon, ArrowDownIcon,
    StorefrontIcon, CaretDownIcon, CoinsIcon, PiggyBankIcon,
    PaperPlaneTiltIcon, CheckCircleIcon,
    DownloadIcon, LightningIcon, ActivityIcon, TimerIcon, MagnifyingGlassIcon,
    CheckIcon
} from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import LogoField from '@/components/shared/LogoField';
import { SERVICES, CATEGORIES, Service, SubscriptionPlan } from '@/data/subscriptions';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import ServiceCard from '@/components/subscriptions/ServiceCard';
import SubscribeModal from '@/components/subscriptions/SubscribeModal';
import ActiveSubscriptionCard from '@/components/subscriptions/ActiveSubscriptionCard';
import SecuritySettings from '@/components/security/SecuritySettings';
import FullProfileEditModal from '@/components/shared/FullProfileEditModal';
import ParticlesBackground from '@/components/shared/ParticlesBackground';
import OnboardingModal from '@/components/shared/OnboardingModal';
import { useMerchant } from '@/context/MerchantContext';
import CreateSavingsModal from '@/components/shared/CreateSavingsModal';
import SavingsPotView from '@/components/shared/SavingsPotView';
import SavingsReceiptsModal from '@/components/shared/SavingsReceiptsModal';
import UnifiedSendModal from '@/components/shared/UnifiedSendModal';
import { useInjective } from '@/hooks/useInjective';
import { useSavings } from '@/hooks/useSavings';
import { useToast } from '@/context/ToastContext';
import { useReceipts } from '@/hooks/useReceipts';
import { supabase } from '@/lib/supabase';

type NavSection = 'overview' | 'subscriptions' | 'wallet' | 'security' | 'payment-link' | 'receipts' | 'dev-keys' | 'savings';

interface TxSpeed {
    start: number | null;
    end: number | null;
    status: 'idle' | 'running' | 'completed';
}

export default function Dashboard() {
    const {
        profile,
        loading: profileLoading,
        session,
        sessionInitialized,
        createProfile,
        updateProfile
    } = useUserProfile();

    const {
        address,
        balance: walletBalance,
        isLoading: loadingTransactions,
        isConnected,
        connect,
        disconnect,
        refreshBalance: refreshWalletBalance,
        transactions,
        fetchTransactions,
        isConnecting
    } = useInjective();

    const { showToast } = useToast();
    const { pots } = useSavings();
    const router = useRouter();

    const [custodialBalance, setCustodialBalance] = useState<number>(0);
    // Calculate display balance (prioritize connected wallet)
    const displayBalance = address ? (walletBalance || 0) : custodialBalance;
    const usdcBalance = 0;

    const logout = async () => {
        try {
            await supabase.auth.signOut();
            localStorage.removeItem('auth_email');
            disconnect();
            router.push('/signin');
        } catch (error) {
            console.error('Logout failed:', error);
            router.push('/');
        }
    };

    const [activeSection, setActiveSection] = useState<NavSection>('overview');
    const [showSendModal, setShowSendModal] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    // Auth Guard: Redirect to Home if not authenticated
    useEffect(() => {
        // block until all initial checks are done
        if (loadingTransactions || profileLoading || !sessionInitialized) return;

        // If we HAVE a session or address, we are good. Stop waiting.
        if (session || address) {
            console.log('🛡️ [Dashboard Guard] Access granted');
            return;
        }

        // Only if we definitively have NEITHER after loading, do we wait a tiny bit to be sure
        const timer = setTimeout(() => {
            if (!session && !address) {
                console.error("🚫 [Dashboard Guard] Auth definitively not found. Redirecting to home...");
                router.push('/');
            }
        }, 800); // Reduced to 800ms now that session-clearing is fixed

        return () => clearTimeout(timer);
    }, [session, address, loadingTransactions, profileLoading, sessionInitialized, router]);

    const userProfile = {
        username: profile?.username || 'User',
        gender: profile?.gender || 'other',
        avatar: profile?.emoji || '👤',
        avatar_url: profile?.avatar_url || '',
        pin: profile?.pin || '',
        email: profile?.email || ''
    };

    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isOnboardingSubmitting, setIsOnboardingSubmitting] = useState(false);
    const [isProfileSaving, setIsProfileSaving] = useState(false);
    const [txSpeed, setTxSpeed] = useState<TxSpeed>({ start: null, end: null, status: 'idle' });
    const { receipts, createReceipt } = useReceipts(address); // Pass the connected wallet address
    const [injPrice, setInjPrice] = useState<number | null>(null);

    // Merge on-chain transactions with local receipts for immediate visibility
    const mergedTransactions = (() => {
        const onChain = transactions || [];
        const local = (receipts || []).map(r => ({
            signature: r.tx_signature,
            amount: r.amount_inj,
            timestamp: new Date(r.timestamp).getTime(),
            err: r.status === 'failed',
            isLocal: true // Help UI distinguish
        }));

        // Use a Map to deduplicate by signature (hash)
        const combined = new Map();

        // Add on-chain first (they are our source of truth)
        onChain.forEach((tx: any) => {
            // Normalize explorer fields if needed (e.g. if signature is called hash)
            const signature = tx.signature || tx.hash || tx.tx_hash;
            if (signature) {
                combined.set(signature, { ...tx, signature });
            }
        });

        // Add local receipts
        local.forEach(tx => {
            if (!combined.has(tx.signature)) {
                combined.set(tx.signature, tx);
            }
        });

        // Force results to be sorted by timestamp
        const finalResults = Array.from(combined.values())
            .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

        console.log(`📊 [mergedTransactions] Merged ${finalResults.length} txs (${onChain.length} on-chain, ${local.length} local)`);
        return finalResults;
    })();

    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=injective-protocol&vs_currencies=usd');
                const data = await res.json();
                setInjPrice(data['injective-protocol'].usd);
            } catch (error) {
                console.error('Failed to fetch INJ price:', error);
            }
        };
        fetchPrice();
    }, []);

    // Speed Timer Effect
    useEffect(() => {
        let interval: any;
        if (txSpeed.status === 'running') {
            interval = setInterval(() => { }, 50);
        }
        return () => clearInterval(interval);
    }, [txSpeed.status]);

    // Log active address for debugging
    useEffect(() => {
        if (address) {
            console.log("Active CadPay Address:", address);
        }
    }, [address]);

    // Fetch Custodial Balance if not connected to Injective
    useEffect(() => {
        if (!address && profile?.authority) {
            fetch(`/api/injective/balance?address=${profile.authority}`)
                .then(res => res.json())
                .then(data => {
                    setCustodialBalance(data.balance || 0);
                })
                .catch(err => console.error("Failed to fetch custodial balance:", err));
        }
    }, [address, profile?.authority]);

    // Refresh function that handles both
    const refreshBalance = () => {
        if (address) {
            refreshWalletBalance();
        } else if (profile?.authority) {
            fetch(`/api/injective/balance?address=${profile.authority}`)
                .then(res => res.json())
                .then(data => setCustodialBalance(data.balance || 0))
                .catch(err => console.error("Failed to refresh custodial balance:", err));
        }
    };

    // Unified Send Handler - Call this when a transaction is COMPLETED
    const onTransactionSuccess = async (recipient: string, amount: number, isSavings: boolean) => {
        try {
            // End speed tracking
            setTxSpeed({ start: txSpeed.start, end: Date.now(), status: 'completed' });

            showToast(
                isSavings ? `Successfully deposited ${amount.toFixed(2)} INJ to savings pot!` : `Successfully sent ${amount.toFixed(2)} INJ!`,
                "success"
            );

            // Refresh balance and transactions after completion
            setTimeout(() => {
                refreshBalance();
                if (fetchTransactions) fetchTransactions();
            }, 500);

            // Double check refresh
            setTimeout(() => {
                refreshBalance();
                if (fetchTransactions) fetchTransactions();
            }, 3000);
        } catch (error: any) {
            setTxSpeed({ start: null, end: null, status: 'idle' });
            showToast(error.message || "Transaction failed", "error");
            console.error('Transaction success handler error:', error);
        }
    };

    // Use Real On-Chain Balance
    const refetchUsdc = async () => { };

    useEffect(() => {
        // Debounce the onboarding check to prevent flashing during loading states
        const timer = setTimeout(() => {
            if (loadingTransactions || profileLoading) return;

            // Trigger Onboarding if:
            // 1. Profile exists but is incomplete (No Username OR No PIN) 
            //    -> Covers Google users (have username but no PIN) & Custodial
            if (profile && (!profile.username || !profile.pin)) {
                console.log("⚠️ Profile incomplete, triggering Onboarding...");
                setShowOnboarding(true);
            } else if (!profile && (address || session)) {
                console.log("⚠️ Logged in but no profile found, triggering Onboarding...");
                setShowOnboarding(true);
            } else {
                setShowOnboarding(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [address, loadingTransactions, profile, profileLoading]);

    const activeAddress = address || profile?.authority || "";
    // Onboarding handlers
    const handleOnboardingComplete = async (data: {
        username: string;
        pin: string;
        gender: string;
        avatar: string;
        email: string;
        avatar_url?: string;
    }) => {
        setIsOnboardingSubmitting(true);
        try {
            // 1. Ensure Wallet Exists (Custodial Only)
            const isBiometricUser = profile?.auth_method === 'biometric';

            if (!address && !isBiometricUser) {
                if (!profile?.authority) {
                    const res = await fetch('/api/wallet/create', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session?.access_token}`
                        }
                    });
                    const walletData = await res.json();

                    if (!res.ok || !walletData.success) {
                        throw new Error(walletData.error || "Failed to generate wallet");
                    }
                }
            }

            // 2. Save Profile Details (Upsert will merge with wallet data)
            console.log("💾 Saving profile with data:", data);
            const result = await createProfile(data.username, data.avatar, data.gender, data.pin, data.email, data.avatar_url);

            if (result) {
                console.log("✅ Profile saved, finishing onboarding...");
                setShowOnboarding(false);
                showToast("Profile created successfully!", "success");

                // Force reload after short delay to ensure DB sync
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (e: any) {
            console.error("Onboarding failed", e);
            showToast(e.message || "Failed to create profile. Try again.", "error");
        } finally {
            setIsOnboardingSubmitting(false);
        }
    };

    // Save profile -> UPDATE ON-CHAIN PROFILE
    const saveUserProfile = async (data: { username: string; gender: string; avatar: string; pin?: string; email?: string }) => {
        setIsProfileSaving(true);
        try {
            const existingPin = profile?.pin || "0000";
            const targetPin = data.pin && data.pin.length === 4 ? data.pin : existingPin;
            const targetEmail = data.email !== undefined ? data.email : profile?.email;

            await updateProfile(data.username, data.avatar, data.gender, targetPin, targetEmail);
            setShowProfileEdit(false);
            showToast("Profile updated on-chain!", "success");
        } catch (e) {
            console.error("Update failed", e);
            showToast("Failed to update profile", "error");
        } finally {
            setIsProfileSaving(false);
        }
    };

    // Fallback to profile.authority (Custodial Address) if Injective is not connected
    const walletAddress = address || profile?.authority || "";
    const isCustodial = !address && !!profile?.authority;

    // Debug Active Mode
    useEffect(() => {
        if (address) console.log("🔵 Dashboard Mode: Injective Connected", address);
        else if (profile?.authority) console.log("望 Dashboard Mode: Custodial", profile.authority);
    }, [address, profile]);


    const copyToClipboard = () => {
        if (walletAddress && walletAddress !== "Loading...") {
            navigator.clipboard.writeText(walletAddress);
            showToast("Address copied to clipboard!", "success");
        }
    };

    return (
        <div className="min-h-screen bg-[#000000] text-white font-sans relative overflow-hidden">
            {/* Blue Glow Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(234,88,12,0.1),transparent_50%)] z-0" />

            {/* Particle Dust Animation */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <ParticlesBackground
                    id="user-dashboard-particles"
                    particleCount={150}
                    particleSize={2}
                    speed={0.5}
                    linkDistance={100}
                    linkOpacity={0.2}
                    className="absolute inset-0"
                />
            </div>

            {/* Background Logo Field */}
            <LogoField count={6} className="fixed inset-0 z-0 opacity-30" />

            {/* Sidebar Toggle Button - Only shows when sidebar is closed */}
            {!sidebarOpen && (
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="fixed top-4 left-4 md:top-6 md:left-6 z-50 w-12 h-12 md:w-10 md:h-10 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center hover:bg-zinc-800/80 transition-colors shadow-lg"
                >
                    <ListIcon size={24} className="md:w-5 md:h-5" />
                </button>
            )}

            {/* Mobile Backdrop Overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
                    />
                )}
            </AnimatePresence>

            {/* Glassmorphism Sidebar */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.aside
                        initial={{ x: -300 }}
                        animate={{ x: 0 }}
                        exit={{ x: -300 }}
                        className="fixed left-0 top-0 h-screen w-80 md:w-72 bg-zinc-900/40 backdrop-blur-xl border-r border-white/10 z-40 p-4 md:p-6 flex flex-col overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-8 mt-2">
                            <div className="flex items-center gap-3">
                                <img src="/icon.ico" alt="CadPay" className="w-10 h-10 rounded-xl object-contain" />
                                <span className="text-xl font-bold tracking-tight">CadPay</span>
                            </div>
                            {/* Close button on the right - visible on all screens */}
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                            >
                                <XIcon size={20} />
                            </button>
                        </div>


                        {/* Navigation */}
                        <nav className="space-y-6">
                            {/* MAIN Section */}
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 px-3">
                                    Personal
                                </p>
                                <div className="space-y-1">
                                    <NavItem
                                        icon={<HouseIcon size={20} />}
                                        label="Overview"
                                        active={activeSection === 'overview'}
                                        onClick={() => { setActiveSection('overview'); if (window.innerWidth < 768) setSidebarOpen(false); }}
                                    />
                                    <NavItem
                                        icon={<ReceiptIcon size={20} />}
                                        label="My Subscriptions"
                                        active={activeSection === 'subscriptions'}
                                        onClick={() => { setActiveSection('subscriptions'); if (window.innerWidth < 768) setSidebarOpen(false); }}
                                    />
                                    <NavItem
                                        icon={<WalletIcon size={20} />}
                                        label="Wallet & Cards"
                                        active={activeSection === 'wallet'}
                                        onClick={() => { setActiveSection('wallet'); if (window.innerWidth < 768) setSidebarOpen(false); }}
                                    />
                                    <NavItem
                                        icon={<PiggyBankIcon size={20} />}
                                        label="Savings Wallet"
                                        active={activeSection === 'savings'}
                                        onClick={() => { setActiveSection('savings'); if (window.innerWidth < 768) setSidebarOpen(false); }}
                                    />
                                    <NavItem
                                        icon={<KeyIcon size={20} />}
                                        label="Security"
                                        active={activeSection === 'security'}
                                        onClick={() => { setActiveSection('security'); if (window.innerWidth < 768) setSidebarOpen(false); }}
                                    />
                                    <NavItem
                                        icon={<ReceiptIcon size={20} />}
                                        label="Receipts"
                                        active={activeSection === 'receipts'}
                                        onClick={() => { setActiveSection('receipts'); if (window.innerWidth < 768) setSidebarOpen(false); }}
                                    />
                                </div>
                            </div>
                        </nav>

                        {/* Logout & Profile at Bottom */}
                        <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                            <div className="flex items-center gap-3 px-3 py-2 cursor-pointer group" onClick={() => setShowProfileEdit(true)}>
                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xl overflow-hidden border border-white/10 transition-transform group-hover:scale-105">
                                    {userProfile.avatar_url ? (
                                        <img src={userProfile.avatar_url} alt={userProfile.username} className="w-full h-full object-cover" />
                                    ) : (
                                        userProfile.avatar
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{userProfile.username}</p>
                                    <p className="text-[10px] text-zinc-500 truncate">{userProfile.email || 'No email'}</p>
                                </div>
                            </div>

                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-3 px-3 py-3 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            >
                                <SignOutIcon size={20} />
                                <span>Logout</span>
                            </button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className={`${sidebarOpen ? 'ml-0 md:ml-72' : 'ml-0'} relative z-10 transition-all duration-300`}>
                <div className="p-4 sm:p-6 md:p-8 lg:p-12 pt-20 md:pt-24">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
                    </div>
                    {activeSection === 'overview' && (
                        <OverviewSection
                            userName={userProfile.username}
                            avatar={userProfile.avatar}
                            avatarUrl={userProfile.avatar_url}
                            balance={displayBalance}
                            address={address || ""}
                            refreshBalance={refreshWalletBalance}
                            loading={isConnecting} // Use isConnecting for general loading state
                            loadingTransactions={loadingTransactions} // Pass the new prop
                            copyToClipboard={copyToClipboard}
                            onOpenSend={() => setShowSendModal(true)}
                            onTransactionSuccess={onTransactionSuccess}
                            transactions={mergedTransactions} // Use merged list!
                            fetchTransactions={fetchTransactions}
                            txSpeed={txSpeed}
                            setTxSpeed={setTxSpeed}
                            pots={pots}
                        />
                    )}

                    {activeSection === 'subscriptions' && <SubscriptionsSection txSpeed={txSpeed} setTxSpeed={setTxSpeed} balance={displayBalance} injPrice={injPrice} />}

                    {activeSection === 'wallet' && <WalletSection
                        balance={displayBalance.toFixed(2)}
                        address={walletAddress} />}
                    {activeSection === 'security' && <SecuritySettings />}
                    {activeSection === 'payment-link' && <PaymentLinkSection />}
                    {activeSection === 'receipts' && <ReceiptsSection address={address || ""} />}
                    {activeSection === 'dev-keys' && <DevKeysSection />}
                    {activeSection === 'savings' && <SavingsSection session={session} />}
                </div>
            </div>

            {/* Full Profile Edit Modal */}
            <FullProfileEditModal
                isOpen={showProfileEdit}
                isLoading={isProfileSaving}
                onClose={() => setShowProfileEdit(false)}
                currentProfile={{
                    username: userProfile.username,
                    gender: userProfile.gender,
                    avatar: userProfile.avatar
                }}
                onSave={saveUserProfile}
            />

            {/* Onboarding Modal - First Time Setup */}
            <OnboardingModal
                isOpen={showOnboarding}
                isSubmitting={isProfileSaving || isOnboardingSubmitting} // Use both loading states
                walletAddress={walletAddress}
                initialProfile={{
                    username: profile?.username ||
                        session?.user?.user_metadata?.full_name ||
                        session?.user?.user_metadata?.name ||
                        (session?.user?.email ? session.user.email.split('@')[0] : ''),
                    email: profile?.email || session?.user?.email || '',
                    avatar_url: profile?.avatar_url || session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture || ''
                }}
                onComplete={handleOnboardingComplete}
            />

            <UnifiedSendModal
                isOpen={showSendModal}
                onClose={() => setShowSendModal(false)}
                onSend={onTransactionSuccess}
                pots={pots}
                balance={address ? (walletBalance || 0) : custodialBalance}
            />

            <SpeedConfirmationOverlay txSpeed={txSpeed} setTxSpeed={setTxSpeed} />
        </div>
    );
}

// Custom Mobile Dropdown Component
function MobileDropdown({ options, value, onChange, label }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find((opt: any) => opt.id === value);

    return (
        <div className="relative md:hidden w-full">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-sm font-bold text-white transition-all hover:bg-white/5 active:scale-[0.98]"
            >
                <div className="flex items-center gap-2">
                    {label && <span className="text-zinc-500 font-medium">{label}:</span>}
                    <span>{selectedOption?.name || selectedOption?.label}</span>
                </div>
                <CaretDownIcon size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-40"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 backdrop-blur-xl"
                        >
                            <div className="p-1">
                                {options.map((option: any) => (
                                    <button
                                        key={option.id}
                                        onClick={() => {
                                            onChange(option.id);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 text-sm rounded-lg transition-colors flex items-center justify-between ${value === option.id
                                            ? 'bg-orange-600 text-white font-bold'
                                            : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        {option.name || option.label}
                                        {value === option.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

// Navigation Item Component
function NavItem({ icon, label, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all group ${active
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
        >
            {icon}
            <span className="text-sm font-medium flex-1 text-left">{label}</span>
            {active && <CaretRightIcon size={16} weight="bold" />}
        </button>
    );
}

// Overview Section
function OverviewSection({
    userName, avatar, avatarUrl, balance, address, loading,
    copyToClipboard, onOpenSend, refreshBalance, transactions,
    fetchTransactions, txSpeed, setTxSpeed, pots, onTransactionSuccess,
    loadingTransactions
}: {
    userName: string,
    avatar: string,
    avatarUrl?: string,
    balance: number,
    address: string,
    loading: boolean,
    copyToClipboard: () => void,
    onOpenSend: () => void, refreshBalance: () => void, transactions: any[],
    fetchTransactions: (addr?: string) => Promise<void> | void,
    txSpeed: TxSpeed,
    setTxSpeed: React.Dispatch<React.SetStateAction<TxSpeed>>,
    pots: any[],
    onTransactionSuccess: (recipient: string, amount: number, isSavings: boolean) => Promise<void>,
    loadingTransactions: boolean
}) {
    const [showUSD, setShowUSD] = useState(true);
    const [injPrice, setInjPrice] = useState<number | null>(null);
    const { subscriptions, loading: loadingSub } = useSubscriptions();
    const [isFunding, setIsFunding] = useState(false);
    const { showToast } = useToast();
    const { createReceipt } = useReceipts(address);

    // Speed Timer Effect
    useEffect(() => {
        let interval: any;
        if (txSpeed.status === 'running') {
            interval = setInterval(() => {
                // Just to trigger re-renders if we wanted a live counter
            }, 50);
        }
        return () => clearInterval(interval);
    }, [txSpeed.status]);

    // Fetch INJ price
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=injective-protocol&vs_currencies=usd');
                const data = await response.json();
                setInjPrice(data['injective-protocol'].usd);
            } catch (error) {
                console.error('Failed to fetch INJ price:', error);
            }
        };
        fetchPrice();
    }, []);

    // Initial fetch for transactions
    useEffect(() => {
        if (address && fetchTransactions) {
            fetchTransactions(address);
        }
    }, [address, fetchTransactions]);

    const handleFundDemo = async () => {
        if (!address) return;
        setIsFunding(true);
        setTxSpeed({ start: Date.now(), end: null, status: 'running' });

        try {
            // Removed pending toast to reduce excess notifications
            const res = await fetch('/api/faucet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: address, amount: 2 })
            });
            const data = await res.json();

            if (data.success) {
                const endTime = Date.now();
                setTxSpeed((prev: TxSpeed) => ({ ...prev, end: endTime, status: 'completed' }));

                const fundingAmount = data.amount || 2;
                const txHash = data.txId || `faucet_${Date.now()}`;

                // Create receipt for funding
                await createReceipt({
                    wallet_address: address,
                    service_name: 'Private Vault',
                    plan_name: 'Faucet Funding',
                    amount_inj: fundingAmount,
                    amount_usd: fundingAmount * (injPrice || 0),
                    status: 'completed',
                    tx_signature: txHash,
                    sender_address: 'inj1qx4zetjcg6kjk45wkw8kys9pv67qht7lx78va5', // Private Faucet
                    receiver_address: address
                });

                showToast(`Funding Successful! +${fundingAmount} INJ`, "success");

                // Use unified success handler for consistent UI refresh
                if (onTransactionSuccess) {
                    await onTransactionSuccess(address, fundingAmount, false);
                }
            } else {
                setTxSpeed({ start: null, end: null, status: 'idle' });
                showToast(data.error || "Faucet failed", "error");
            }
        } catch (e) {
            setTxSpeed({ start: null, end: null, status: 'idle' });
            showToast("Faucet request failed", "error");
        } finally {
            setIsFunding(false);
        }
    };

    const balanceValue = balance || 0;
    const usdValue = injPrice ? (balanceValue * injPrice).toFixed(2) : '...';

    return (
        <div className="space-y-8 px-4 md:px-0">
            {/* Stats Grid - Standard Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Main Balance Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:col-span-8 bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                        <CurrencyDollarIcon size={160} />
                    </div>

                    <div className="relative z-10">
                        <div className="space-y-1">
                            <p className="text-sm text-zinc-400 font-medium">Available Balance</p>
                            <div className="flex items-baseline gap-3">
                                <h2 className="text-4xl md:text-5xl font-black text-white">
                                    {balanceValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h2>
                                <span className="text-xl font-bold text-zinc-500 uppercase">INJ</span>
                            </div>
                            <p className="text-lg text-[#70C7BA] font-medium">≈ ${usdValue} USD</p>
                        </div>

                        <div className="flex flex-wrap gap-4 mt-8">
                            <button
                                onClick={handleFundDemo}
                                disabled={loading || isFunding}
                                className="px-8 py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all flex items-center gap-2 shadow-lg shadow-white/5 active:scale-95"
                            >
                                {isFunding ? (
                                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <LightningIcon weight="bold" />
                                )}
                                {isFunding ? 'Funding...' : 'Fund Wallet'}
                            </button>
                            <button
                                onClick={onOpenSend}
                                className="px-8 py-3 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95"
                            >
                                <PaperPlaneTiltIcon size={18} weight="bold" />
                                Send Funds
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Sidebar Stats */}
                <div className="md:col-span-4 space-y-6">
                    <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-zinc-400 font-medium">Active Subscriptions</p>
                            <StorefrontIcon size={20} className="text-orange-400" />
                        </div>
                        {loadingSub ? (
                            <div className="h-9 w-12 bg-white/5 rounded-lg animate-pulse" />
                        ) : (
                            <h3 className="text-3xl font-bold text-white transition-all">{subscriptions.length}</h3>
                        )}
                        <p className="text-xs text-zinc-500 mt-1">Manage recurring payments</p>
                    </div>

                    <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-zinc-400 font-medium font-mono truncate max-w-[150px]">{address}</p>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(address);
                                    // Removed toast to reduce excess notifications
                                }}
                                className="text-zinc-500 hover:text-white transition-colors"
                            >
                                <CopyIcon size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500">Smart Wallet Address</p>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Activity & Quick Save */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-8 bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <ListIcon size={20} className="text-orange-500" />
                        Recent Activity
                    </h3>
                    <div className="space-y-3">
                        {loadingTransactions ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                                <p className="text-zinc-500 text-xs font-medium animate-pulse">Fetching transactions...</p>
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-12">
                                <ActivityIcon size={48} className="mx-auto text-zinc-800 mb-3" />
                                <p className="text-zinc-500 text-sm">No transactions yet</p>
                            </div>
                        ) : (
                            transactions.slice(0, 5).map((tx: any) => (
                                <div key={tx.signature} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all group">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tx.err ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                            {tx.err ? <ArrowDownIcon size={18} /> : <CheckCircleIcon size={18} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate max-w-[200px] md:max-w-none">
                                                {tx.signature.slice(0, 12)}...{tx.signature.slice(-8)}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {new Date(tx.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-bold ${tx.err ? 'text-red-400' : 'text-zinc-100'}`}>
                                            {tx.amount.toFixed(2)} INJ
                                        </p>
                                        <p className="text-[10px] text-zinc-500 uppercase font-black">
                                            {tx.err ? 'Failed' : 'Completed'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Save / Analytics */}
                <div className="lg:col-span-4 bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <PiggyBankIcon size={20} className="text-orange-400" />
                        Quick Save
                    </h3>
                    <div className="space-y-3">
                        {pots.length > 0 ? (
                            pots.map((pot: any) => (
                                <button
                                    key={pot.id}
                                    className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"
                                >
                                    <span className="text-sm font-medium text-white">{pot.name}</span>
                                    <PlusIcon size={16} className="text-orange-400" />
                                </button>
                            ))
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-sm text-zinc-500">No savings pots created</p>
                                <button className="mt-3 text-xs font-bold text-orange-500 hover:text-orange-400">
                                    + Create Pot
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


// Speed Confirmation Overlay - Subtle Corner Badge
function SpeedConfirmationOverlay({ txSpeed, setTxSpeed }: {
    txSpeed: { start: number | null, end: number | null, status: 'idle' | 'running' | 'completed' },
    setTxSpeed: React.Dispatch<React.SetStateAction<TxSpeed>>
}) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        let interval: any;
        if (txSpeed.status === 'running' && txSpeed.start) {
            interval = setInterval(() => {
                setElapsed((Date.now() - txSpeed.start!) / 1000);
            }, 10);
        } else if (txSpeed.status === 'completed' && txSpeed.start && txSpeed.end) {
            setElapsed((txSpeed.end - txSpeed.start) / 1000);
        } else if (txSpeed.status === 'idle') {
            setElapsed(0);
        }
        return () => clearInterval(interval);
    }, [txSpeed.status, txSpeed.start, txSpeed.end]);

    // Auto-dismiss after 2 seconds when completed
    useEffect(() => {
        if (txSpeed.status === 'completed') {
            const timeout = setTimeout(() => {
                setTxSpeed({ start: null, end: null, status: 'idle' });
            }, 2000);
            return () => clearTimeout(timeout);
        }
    }, [txSpeed.status, setTxSpeed]);

    return (
        <AnimatePresence>
            {txSpeed.status !== 'idle' && (
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    className="fixed bottom-8 right-8 z-100 pointer-events-none"
                >
                    <div className="bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-full p-1 pr-6 flex items-center gap-4 shadow-2xl overflow-hidden min-w-[240px]">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${txSpeed.status === 'running' ? 'bg-orange-500' : 'bg-green-500'}`}>
                            {txSpeed.status === 'running' ? (
                                <LightningIcon size={24} className="text-white animate-pulse" />
                            ) : (
                                <CheckCircleIcon size={24} className="text-white" />
                            )}
                        </div>

                        <div className="flex-1">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">
                                {txSpeed.status === 'running' ? 'Broadcasting...' : 'Sonic Confirmation'}
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-xl font-black tabular-nums ${txSpeed.status === 'running' ? 'text-white' : 'text-green-500'}`}>
                                    {elapsed.toFixed(3)}s
                                </span>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase">Injective L1</span>
                            </div>
                        </div>

                        {txSpeed.status === 'running' && (
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="w-2 h-2 rounded-full bg-orange-500 mr-2"
                            />
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function StatCard({ title, value, color }: { title: string; value: string; color: 'blue' | 'purple' }) {
    const colors = {
        blue: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400',
        purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    };
    return (
        <div className="flex justify-center">
            <div className={`bg-linear-to-br ${colors[color]} backdrop-blur-md border rounded-full aspect-square w-full max-w-[200px] flex flex-col items-center justify-center p-6 text-center shadow-lg`}>
                <p className="text-xs text-zinc-400 mb-1">{title}</p>
                <p className="text-2xl md:text-3xl font-bold">{value}</p>
            </div>
        </div>
    );
}

// Subscriptions Section
function SubscriptionsSection({
    txSpeed, setTxSpeed, balance, injPrice
}: {
    txSpeed: TxSpeed,
    setTxSpeed: React.Dispatch<React.SetStateAction<TxSpeed>>,
    balance: number,
    injPrice: number | null
}) {
    const [activeTab, setActiveTab] = useState<'browse' | 'active' | 'analytics'>('browse');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);


    const { showToast } = useToast();

    const { address } = useInjective();
    const { profile } = useUserProfile();
    // Use effective address for custodial users
    const effectiveAddress = address || profile?.authority;

    const {
        subscriptions,
        addSubscription,
        removeSubscription,
        getMonthlyTotal,
        getHistoricalData,
        loading: loadingSub
    } = useSubscriptions();
    const { services: dynamicServices, merchants } = useMerchant();

    // Merge Static + Dynamic Services (Filter out duplicates)
    const staticServiceNames = SERVICES.map(s => s.name.toLowerCase());
    const allServices = [
        ...SERVICES,
        ...dynamicServices
            .filter(ds => !staticServiceNames.includes(ds.name.toLowerCase())) // Remove duplicates
            .map(ds => ({
                id: ds.id,
                name: ds.name,
                description: ds.description || 'Custom Service',
                priceUSD: ds.price,
                icon: StorefrontIcon, // Default icon for dynamic services
                color: ds.color,
                category: 'other' as const, // Default category
                features: ['Unified Billing', 'Gasless Payments', 'Instant Access'],
                plans: [{
                    name: 'Standard',
                    priceUSD: ds.price,
                    features: ['Full Access', 'Priority Support', 'HD Streaming']
                }]
            }))
    ];

    const spendingData = [
        { name: 'Jan', amount: 45 },
        { name: 'Feb', amount: 52 },
        { name: 'Mar', amount: 48 },
        { name: 'Apr', amount: 70 },
        { name: 'May', amount: 65 },
        { name: 'Jun', amount: 85 },
    ];



    const handleServiceClick = (service: Service) => {
        setSelectedService(service);
        setShowSubscribeModal(true);
    };

    const handleSubscribe = async (serviceId: string, plan: SubscriptionPlan, email: string, price: number, txId: string) => {
        try {
            if (!effectiveAddress) throw new Error("Wallet not connected");

            setTxSpeed({ start: Date.now(), end: null, status: 'running' });

            const actualService = SERVICES.find(s => s.id === serviceId) || dynamicServices.find(s => s.id === serviceId);

            await addSubscription({
                serviceId,
                serviceName: actualService ? actualService.name : serviceId,
                plan: plan.name,
                priceUSD: plan.priceUSD,
                email,
                color: actualService ? actualService.color : '#FF6B35',
                transactionSignature: txId
            });

            const endTime = Date.now();
            setTxSpeed((prev: TxSpeed) => ({ ...prev, end: endTime, status: 'completed' }));

            // Success feedback
            showToast(`Successfully subscribed to ${actualService?.name || serviceId}! 🎉`, 'success');
            setShowSubscribeModal(false);

            setTimeout(() => {
                setTxSpeed({ start: null, end: null, status: 'idle' });
            }, 4000);
        } catch (error: any) {
            setTxSpeed({ start: null, end: null, status: 'idle' });
            console.error("Subscription failed:", error);
            showToast("Subscription failed", "error");
        }
    };

    const categoryCount = (cat: string) => {
        if (cat === 'all') return allServices.length;
        return allServices.filter(s => s.category === cat).length;
    };

    const filteredServices = allServices.filter(s => {
        const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="space-y-8">
            {/* Header with Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold">Subscriptions</h2>

                {/* Desktop Tabs */}
                <div className="hidden md:flex flex-wrap gap-2 bg-zinc-900/50 p-1 rounded-full border border-white/5">
                    <button
                        onClick={() => setActiveTab('browse')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'browse' ? 'bg-orange-500 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                            }`}
                    >
                        Browse
                    </button>
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white'
                            }`}
                    >
                        Active ({subscriptions.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'analytics' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white'
                            }`}
                    >
                        Analytics
                    </button>
                </div>

                {/* Mobile Dropdown Tab */}
                <MobileDropdown
                    options={[
                        { id: 'browse', name: 'Browse Services' },
                        { id: 'active', name: `Active Subscriptions (${subscriptions.length})` },
                        { id: 'analytics', name: 'Spending Analytics' }
                    ]}
                    value={activeTab}
                    onChange={setActiveTab}
                />
            </div>

            {activeTab === 'browse' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <StorefrontIcon size={24} className="text-orange-500" />
                            <span className="whitespace-nowrap">Your Subscriptions</span>
                        </h2>

                        {/* Search Bar */}
                        <div className="relative flex-1 max-w-md mx-4 hidden md:block">
                            <MagnifyingGlassIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search subscriptions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 transition-all"
                            />
                        </div>

                        {/* Mobile Search Bar (Visible only on mobile) */}
                        <div className="relative w-full md:hidden mb-2">
                            <MagnifyingGlassIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search subscriptions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 transition-all"
                            />
                        </div>

                        {/* Desktop Filter Pills */}
                        <div className="hidden sm:flex flex-wrap gap-2 p-1 bg-zinc-900/50 rounded-xl border border-white/5">
                            {CATEGORIES.filter(c => c.count > 0).slice(0, 4).map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategoryFilter(cat.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${categoryFilter === cat.id
                                        ? 'bg-white text-black shadow-lg'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>

                        {/* Mobile Category Dropdown */}
                        <MobileDropdown
                            options={CATEGORIES.filter(c => c.count > 0).slice(0, 4)}
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                            label="Category"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {(() => {
                            const items: React.ReactNode[] = filteredServices.map(service => (
                                <ServiceCard
                                    key={service.id}
                                    service={service}
                                    onClick={() => handleServiceClick(service)}
                                />
                            ));

                            const spendingWidget = (
                                <div key="spending-widget" className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl group h-full">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="font-bold text-white">Spending Activity</h3>
                                            <p className="text-xs text-zinc-400">Past 6 Months</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-white">$365</p>
                                            <p className="text-[10px] text-green-400 font-bold uppercase">+12% vs last mo</p>
                                        </div>
                                    </div>

                                    <div className="h-[150px] w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={spendingData}>
                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#71717a', fontSize: 10 }}
                                                />
                                                <RechartsTooltip
                                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                                                    labelStyle={{ color: '#a1a1aa' }}
                                                />
                                                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                                                    {spendingData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 5 ? '#f97316' : '#27272a'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            );

                            const overviewWidget = (
                                <div key="overview-widget" className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl h-full flex flex-col justify-center">
                                    <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                                        <WalletIcon size={20} className="text-orange-500" />
                                        Monthly Overview
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center">
                                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Budget</p>
                                            <p className="text-xl font-bold text-white">$500</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center">
                                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Savings</p>
                                            <p className="text-xl font-bold text-orange-400">$125</p>
                                        </div>
                                    </div>
                                </div>
                            );

                            // Insert Spending Widget at index 3 (4th position)
                            if (items.length >= 3) items.splice(3, 0, spendingWidget);
                            else items.push(spendingWidget);

                            // Insert Overview Widget at index 7 (8th position)
                            if (items.length >= 7) items.splice(7, 0, overviewWidget);
                            else items.push(overviewWidget);

                            return items;
                        })()}
                    </div>
                </div>
            )}

            {/* Active Subscriptions Tab */}
            {activeTab === 'active' && (
                <div>
                    {subscriptions.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ReceiptIcon size={40} className="text-zinc-600" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No Active Subscriptions</h3>
                            <p className="text-zinc-400 mb-6">Browse services and subscribe to get started</p>
                            <button
                                onClick={() => setActiveTab('browse')}
                                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all"
                            >
                                Browse Services
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div className="bg-linear-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-xl p-6 mb-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-orange-200/60 mb-1">Monthly Spending</p>
                                        <p className="text-4xl font-bold text-white">${getMonthlyTotal().toFixed(2)}</p>
                                        {injPrice && (
                                            <p className="text-sm text-orange-200/40 mt-1">
                                                ≈ {(getMonthlyTotal() / injPrice).toFixed(2)} INJ
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-orange-200/60 mb-1">Active Services</p>
                                        <p className="text-4xl font-bold text-white">{subscriptions.length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <AnimatePresence>
                                    {subscriptions.map((sub) => (
                                        <ActiveSubscriptionCard
                                            key={sub.id}
                                            subscription={sub}
                                            onUnsubscribe={removeSubscription}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>
            )
            }

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {/* Monthly Spending Chart */}
                        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Monthly Spending Trend</h3>
                            <div className="space-y-3">
                                {(() => {
                                    const historicalData = getHistoricalData();
                                    const maxAmount = Math.max(...historicalData.map(d => d.amount));
                                    return historicalData.map((item, idx) => (
                                        <div key={idx}>
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <span className="text-zinc-400">{item.month}</span>
                                                <span className="text-white font-medium">${item.amount.toFixed(2)}</span>
                                            </div>
                                            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-linear-to-r from-orange-500 to-orange-600 rounded-full"
                                                    style={{ width: `${(item.amount / maxAmount) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* Breakdown by Service */}
                        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Spending Breakdown</h3>
                            {subscriptions.length === 0 ? (
                                <p className="text-zinc-500 text-sm text-center py-8">No active subscriptions to analyze</p>
                            ) : (
                                <div className="space-y-3">
                                    {subscriptions.map((sub) => (
                                        <div key={sub.id} className="flex items-center gap-3">
                                            <div className="text-2xl" style={{ color: sub.color }}>
                                                {(() => {
                                                    const ServiceIcon = SERVICES.find(s => s.id === sub.serviceId)?.icon;
                                                    return ServiceIcon ? <ServiceIcon size={24} /> : <StorefrontIcon size={24} />;
                                                })()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{sub.serviceName}</p>
                                                <p className="text-xs text-zinc-500">{sub.plan} Plan</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-white">${sub.priceUSD}</p>
                                                <p className="text-xs text-zinc-500">
                                                    {((sub.priceUSD / getMonthlyTotal()) * 100).toFixed(0)}%
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid sm:grid-cols-3 gap-4">
                        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-5">
                            <p className="text-xs text-zinc-500 mb-1">Average per Service</p>
                            <p className="text-2xl font-bold text-white">
                                ${subscriptions.length > 0 ? (getMonthlyTotal() / subscriptions.length).toFixed(2) : '0.00'}
                            </p>
                        </div>
                        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-5">
                            <p className="text-xs text-zinc-500 mb-1">Yearly Projection</p>
                            <p className="text-2xl font-bold text-orange-400">${(getMonthlyTotal() * 12).toFixed(2)}</p>
                        </div>
                        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-5">
                            <p className="text-xs text-zinc-500 mb-1">Most Expensive</p>
                            <p className="text-2xl font-bold text-white">
                                {subscriptions.length > 0
                                    ? `$${Math.max(...subscriptions.map(s => s.priceUSD)).toFixed(2)}`
                                    : '$0.00'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Subscribe Modal */}
            <SubscribeModal
                isOpen={showSubscribeModal}
                onClose={() => setShowSubscribeModal(false)}
                service={selectedService}
                onSubscribe={handleSubscribe}
                balance={balance || 0}
                injPrice={injPrice}
                existingSubscriptions={subscriptions}
            />
        </div>
    );
}

// Premium Wallet Card Component
function WalletCard({ balance = "0.00", address = "" }: { balance: string, address: string }) {
    const [copied, setCopied] = useState(false);

    // Formats the address to look cleaner: inj163p...zduhp
    const truncateAddress = (addr: string) => {
        if (!addr) return '';
        return `${addr.slice(0, 9)}...${addr.slice(-5)}`;
    };

    const handleCopy = () => {
        if (!address) return;
        navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative w-full max-w-md aspect-[1.58/1] rounded-2xl p-6 text-white overflow-hidden shadow-2xl transition-transform hover:scale-[1.02] duration-300 border border-white/10 group">

            {/* --- Background Effects --- */}
            {/* Base dark gradient */}
            <div className="absolute inset-0 bg-linear-to-br from-zinc-800 via-zinc-900 to-black"></div>

            {/* CadPay Orange Glowing Orbs */}
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-orange-500/20 blur-3xl rounded-full transition-all duration-500 group-hover:bg-orange-500/30"></div>
            <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-orange-600/10 blur-2xl rounded-full"></div>

            {/* --- Card Content --- */}
            <div className="relative z-10 flex flex-col justify-between h-full">

                {/* Top Row: Brand & NFC Icon */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                        <div className="bg-zinc-800 p-1 rounded-lg shadow-lg overflow-hidden flex items-center justify-center">
                            <img src="/icon.ico" alt="CadPay" className="w-6 h-6 object-contain" />
                        </div>
                        <span className="font-bold tracking-wider text-lg">CadPay</span>
                    </div>
                    {/* NFC/Contactless Icon */}
                    <div className="flex flex-col items-center gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                        <div className="w-6 h-6 flex items-center justify-center">
                            <div className="flex gap-0.5 items-end">
                                <div className="w-0.5 h-2 bg-white rounded-full opacity-40"></div>
                                <div className="w-0.5 h-3 bg-white rounded-full opacity-60"></div>
                                <div className="w-0.5 h-4 bg-white rounded-full opacity-80"></div>
                                <div className="w-0.5 h-5 bg-white rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Middle Row: Balance */}
                <div className="mt-2">
                    <p className="text-zinc-400 text-xs sm:text-sm font-medium mb-1 uppercase tracking-widest">
                        Main Wallet
                    </p>
                    <div className="flex items-baseline space-x-2">
                        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                            {balance}
                        </h2>
                        <span className="text-xl sm:text-2xl font-semibold text-orange-500">
                            INJ
                        </span>
                    </div>
                </div>

                {/* Bottom Row: Address & Copy Action */}
                <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl p-3 backdrop-blur-md">
                    <p className="font-mono text-sm sm:text-base text-zinc-300 tracking-widest">
                        {truncateAddress(address)}
                    </p>

                    <button
                        onClick={handleCopy}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center"
                        title="Copy Address"
                    >
                        {copied ? (
                            <CheckIcon size={20} weight="bold" className="text-green-400" />
                        ) : (
                            <CopyIcon size={20} weight="duotone" className="text-zinc-400 hover:text-white transition-colors" />
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}

// Wallet Section
function WalletSection({ balance, address }: { balance: string, address: string }) {
    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold">Wallet & Cards</h1>
            <div className="grid md:grid-cols-2 gap-8">
                <WalletCard balance={balance} address={address} />

                {/* Virtual Card Info */}
                <div className="flex flex-col justify-center space-y-4">
                    <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
                        <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Card Status</h4>
                        <div className="flex items-center gap-2 text-green-400">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                            <span className="font-bold">Active & Secure</span>
                        </div>
                    </div>
                    <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
                        <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Network</h4>
                        <p className="text-white font-bold">Injective Testnet (Sentry)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Payment Link Section
function PaymentLinkSection() {
    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold">Create Payment Link</h1>
            <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-8">
                <p className="text-zinc-400 mb-6">Generate payment links to receive KAS payments</p>
                <button className="px-8 py-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all flex items-center gap-2">
                    <PlusIcon weight="bold" size={20} /> Create New Payment Link
                </button>
            </div>
        </div>
    );
}

// Receipts Section - Display Subscription Payment History
function ReceiptsSection({ address }: { address: string }) {
    const { receipts, loading, totalSpending, totalSpendingUSD, fetchReceipts } = useReceipts(address);

    useEffect(() => {
        if (address) {
            fetchReceipts();
            // Poll for new receipts every 5 seconds to ensure we catch updates
            const interval = setInterval(fetchReceipts, 5000);
            return () => clearInterval(interval);
        }
    }, [address, fetchReceipts]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold">Receipts</h1>
                    <p className="text-zinc-400 mt-2">View all your subscription payment receipts</p>
                </div>

                {receipts.length > 0 && (
                    <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-4">
                        <p className="text-xs text-zinc-400 mb-1">Total Amount</p>
                        <p className="text-2xl font-bold text-[#70C7BA]">{totalSpending.toFixed(2)} INJ</p>
                        <p className="text-xs text-zinc-500">≈ ${totalSpendingUSD.toFixed(2)} USD</p>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-12 text-center">
                    <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-400">Loading receipts...</p>
                </div>
            ) : receipts.length === 0 ? (
                <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-12 text-center">
                    <CreditCardIcon size={64} className="mx-auto mb-4 text-zinc-600" />
                    <h2 className="text-xl font-bold mb-2">No receipts yet</h2>
                    <p className="text-zinc-400">Your subscription payment receipts will appear here</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {receipts.map(receipt => (
                        <motion.div
                            key={receipt.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-2xl w-full p-6 flex flex-col group hover:border-orange-500/30 transition-all relative overflow-hidden"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${receipt.status === 'completed'
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-red-500/20 text-red-400'
                                        }`}
                                >
                                    {receipt.status === 'completed' ? (
                                        <CheckCircleIcon size={24} />
                                    ) : (
                                        <XIcon size={24} />
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            window.open(
                                                `https://testnet.explorer.injective.network/transaction/${receipt.tx_signature}`,
                                                '_blank'
                                            );
                                        }}
                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                                        title="View on Explorer"
                                    >
                                        <LinkIcon size={16} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Generate PDF receipt using our utility
                                            const { generateReceiptPDF } = require('@/utils/pdfGenerator');
                                            generateReceiptPDF(receipt);
                                        }}
                                        className="p-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white transition-colors"
                                        title="Download PDF Receipt"
                                    >
                                        <DownloadIcon size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                <h3 className="text-xl font-bold text-white">{receipt.service_name}</h3>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{receipt.plan_name} Plan</p>
                            </div>

                            <div className="mb-4">
                                <p className="text-2xl font-black text-white">
                                    {(receipt as any).amount_inj?.toFixed(2) || (receipt as any).amount_kas?.toFixed(2)} INJ
                                </p>
                                <p className="text-sm text-zinc-400">
                                    ≈ ${receipt.amount_usd.toFixed(2)} USD
                                </p>
                            </div>

                            <div className="space-y-1 mt-2 mb-4">
                                <p className="text-[10px] text-zinc-500 font-mono flex items-center gap-2">
                                    <span className="shrink-0 w-12">From:</span>
                                    <span className="truncate">{receipt.sender_address || 'Vault_System'}</span>
                                </p>
                                <p className="text-[10px] text-zinc-500 font-mono flex items-center gap-2">
                                    <span className="shrink-0 w-12">To:</span>
                                    <span className="truncate">{receipt.receiver_address || receipt.wallet_address}</span>
                                </p>
                            </div>

                            <div className="mt-auto pt-4 border-t border-white/10">
                                <p className="text-xs text-zinc-500">
                                    {new Date(receipt.timestamp).toLocaleString()}
                                </p>
                                <p className="text-[10px] text-zinc-600 font-mono truncate mt-1">
                                    {receipt.tx_signature}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Dev Keys Section
function DevKeysSection() {
    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold">Developer Keys</h1>
            <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-8">
                <p className="text-zinc-400 mb-6">Manage API keys for your applications</p>
                <button className="px-8 py-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all flex items-center gap-2">
                    <KeyIcon weight="bold" size={20} /> Generate API Key
                </button>
            </div>
        </div>
    );
}

// Savings Section
function SavingsSection({ session }: { session: any }) {
    const { pots, isLoading, createPot, withdrawFromPot, depositToPot } = useSavings();
    const { address, refreshBalance, fetchTransactions } = useInjective(); // Need address for receipts
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedPot, setSelectedPot] = useState<any>(null);
    const [showReceipts, setShowReceipts] = useState(false);
    const [isFunding, setIsFunding] = useState(false);
    const [injPrice, setInjPrice] = useState<number | null>(null);
    const { showToast } = useToast();
    const { createReceipt } = useReceipts(address);

    // Fetch INJ price
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=injective-protocol&vs_currencies=usd');
                const data = await response.json();
                setInjPrice(data['injective-protocol'].usd);
            } catch (error) {
                console.error('Failed to fetch INJ price:', error);
            }
        };
        fetchPrice();
    }, []);

    const handleCreatePot = async (name: string, durationMonths: number) => {
        setIsCreating(true);
        try {
            // Simulate API delay (Mock visual feedback)
            await new Promise(resolve => setTimeout(resolve, 1000));

            const result = await createPot(name, durationMonths);

            if (result) {
                showToast("Savings Pot Created! 🐷", "success");
                setShowCreateModal(false);
            } else {
                throw new Error("Failed to create pot");
            }
        } catch (e) {
            console.error(e);
            showToast("Failed to create savings pot", "error");
        } finally {
            setIsCreating(false);
        }
    };

    const handleFundPot = async (potAddress: string, potName: string, amount?: number) => {
        setIsFunding(true);
        try {
            if (!amount) {
                throw new Error("Please enter an amount to transfer");
            }
            // Direct users to use the Send Funds modal for secure client-side signing
            throw new Error("Please use the 'Send Funds' button in the Overview tab to fund your savings pot securely.");
        } catch (e: any) {
            console.error("Fund pot error:", e);
            showToast(e.message || "Transfer failed", "error");
        } finally {
            setIsFunding(false);
        }
    };

    return (
        <div className="space-y-8 min-h-screen pb-24 md:pb-12 px-4 md:px-8 pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Savings Wallet 🐷</h1>
                    <p className="text-zinc-400 mt-2">Manage your financial goals with time-locked savings pots.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all hover:scale-105 shadow-lg shadow-orange-500/20"
                >
                    <PlusIcon weight="bold" /> New Savings Pot
                </button>
            </div>

            {pots.length === 0 ? (
                <div className="bg-zinc-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-12 text-center">
                    <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 mx-auto mb-6">
                        <PiggyBankIcon size={40} weight="duotone" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">No savings pots yet</h2>
                    <p className="text-zinc-500 mb-8 max-w-sm mx-auto">
                        Create your first pot to start saving for your next big purchase or financial goal.
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-8 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-all"
                    >
                        Create My First Pot
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pots.map((pot) => (
                        <SavingsPotView
                            key={pot.id}
                            pot={pot}
                            onWithdraw={(recipient, amount, note) => withdrawFromPot(pot.id, amount)}
                            onRefresh={() => { }}
                            onShowReceipts={() => {
                                setSelectedPot(pot);
                                setShowReceipts(true);
                            }}
                            onFund={(amount) => handleFundPot(pot.address, pot.name, amount)}
                        />
                    ))}
                </div>
            )}

            <CreateSavingsModal
                isOpen={showCreateModal}
                isLoading={isCreating}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreatePot}
            />

            <SavingsReceiptsModal
                isOpen={showReceipts}
                onClose={() => setShowReceipts(false)}
                pot={selectedPot}
            />
        </div>
    );
}
