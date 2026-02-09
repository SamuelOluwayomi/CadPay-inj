'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useLazorkit } from '@/hooks/useLazorkit';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    HouseIcon, UserCircleIcon, CreditCardIcon, PlusIcon, LinkIcon,
    ReceiptIcon, KeyIcon, SignOutIcon, CopyIcon, ArrowRightIcon, WalletIcon,
    CaretRightIcon, ListIcon, XIcon, CurrencyDollarIcon, ArrowUpIcon, ArrowDownIcon,
    StorefrontIcon, CaretDownIcon, CoinsIcon, PiggyBankIcon,
    PaperPlaneTiltIcon, CheckCircleIcon,
    DownloadIcon
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
import OnboardingModal from '@/components/shared/OnboardingModal';
import CopyButton from '@/components/shared/CopyButton';
import { useMerchant } from '@/context/MerchantContext';
import CreateSavingsModal from '@/components/shared/CreateSavingsModal';
import SavingsPotView from '@/components/shared/SavingsPotView';
import UnifiedSendModal from '@/components/shared/UnifiedSendModal';
import { useKasWare } from '@/hooks/useKasWare';
import { useToast } from '@/context/ToastContext';
import { useReceipts } from '@/hooks/useReceipts';

type NavSection = 'overview' | 'subscriptions' | 'wallet' | 'security' | 'payment-link' | 'receipts' | 'dev-keys' | 'savings';

export default function Dashboard() {

    const { address, balance, isLoading: loading, connect, isConnected, disconnect, refreshBalance, transactions, fetchTransactions } = useKasWare();
    const { showToast } = useToast();
    const usdcBalance = 0;


    const pots: any[] = []; // Stub pots
    const wallet = null;
    const requestAirdrop = async () => console.log("Airdrop not supported on Kaspa yet");
    const logout = () => {
        disconnect();
        router.push('/');
    };
    const [activeSection, setActiveSection] = useState<NavSection>('overview');
    const [showSendModal, setShowSendModal] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { profile, loading: profileLoading, createProfile, updateProfile } = useUserProfile();
    const router = useRouter();

    const userProfile = {
        username: profile?.username || 'User',
        gender: profile?.gender || 'other',
        avatar: profile?.emoji || '👤',
        pin: profile?.pin || ''
    };

    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isOnboardingSubmitting, setIsOnboardingSubmitting] = useState(false);
    const [isProfileSaving, setIsProfileSaving] = useState(false);

    // Explicitly log wallet address to console (User Request)
    useEffect(() => {
        if (address) {
            console.log("SMART WALLET ADDRESS:", address);
        }
    }, [address]);

    const handleUnifiedSend = async (recipient: string, amount: number, isSavings: boolean, memo?: string) => {
        if (!address) {
            showToast("Wallet not connected", "error");
            return;
        }

        // STUB: Kaspa payment logic to be implemented
        console.log(`[Kaspa Payment Stub] Sending ${amount} KAS to ${recipient} (Memo: ${memo})`);

        showToast("Kaspa payments coming soon! (UI Demo Only)", "info");

        // Simulating a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        showToast("Simulated transfer complete", "success");
    };

    // Use Real On-Chain Balance (STUBBED for Kaspa)
    // Use Real On-Chain Balance (STUBBED for Kaspa)
    // const { balance: usdcBalance, refetch: refetchUsdc } = useUSDCBalance(address);
    // const usdcBalance = 0; // Removed duplicate
    const refetchUsdc = async () => { };

    useEffect(() => {
        // If we're still loading either the wallet or the profile, do nothing.
        // This prevents the modal from flashing before we know if a profile exists.
        if (loading || profileLoading) return;

        // Only show onboarding if the wallet is connected BUT no profile was found.
        if (address && !profile) {
            setShowOnboarding(true);
        } else {
            setShowOnboarding(false);
        }
    }, [address, loading, profile, profileLoading]);

    // Onboarding handlers
    const handleOnboardingComplete = async (data: { username: string; pin: string; gender: string; avatar: string }) => {
        setIsOnboardingSubmitting(true);
        try {
            const signature = await createProfile(data.username, data.avatar, data.gender, data.pin);
            setShowOnboarding(false);
            if (signature) {
                showToast(
                    `Profile created successfully ${signature.slice(0, 8)}...`,
                    'success'
                );
                // Also log a full link for manual inspection
                console.log('Profile creation tx:', `https://explorer.kaspa.org/tx/${signature}?testnet=true`);
            } else {
                showToast("Profile created successfully!", "success");
            }

            // Navigate to dashboard root to ensure user is on the dashboard view
            try {
                router.push('/dashboard');
            } catch (err) {
                // ignore navigation errors
            }
        } catch (e) {
            console.error("Onboarding failed", e);
            showToast("Failed to create profile. Try again.", "error");
        } finally {
            setIsOnboardingSubmitting(false);
        }
    };

    // Save profile -> UPDATE ON-CHAIN PROFILE
    const saveUserProfile = async (data: { username: string; gender: string; avatar: string; pin?: string }) => {
        setIsProfileSaving(true);
        try {
            if (data.pin && data.pin.length === 4) {
                // Update with PIN
                await updateProfile(data.username, data.avatar, data.gender, data.pin);
            } else {
                // Use existing PIN if not provided (should fetch from profile, but for now we require it or use default)
                const existingPin = profile?.pin || "0000";
                await updateProfile(data.username, data.avatar, data.gender, existingPin);
            }
            setShowProfileEdit(false);
            showToast("Profile updated on-chain!", "success");
        } catch (e) {
            console.error("Update failed", e);
            showToast("Failed to update profile", "error");
        } finally {
            setIsProfileSaving(false);
        }
    };

    const walletAddress = address || "Loading...";
    const displayBalance = balance !== null ? balance.toFixed(4) : "0.00";

    const copyToClipboard = () => {
        if (address) {
            navigator.clipboard.writeText(address);
        }
    };

    return (
        <div className="min-h-screen bg-[#1c1209] text-white font-sans relative overflow-hidden">
            {/* Orange Glow Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(234,88,12,0.1),transparent_50%)] z-0" />

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
                        {/* Header with Logo and Close Button */}
                        <div className="flex items-center justify-between mb-8 mt-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-black font-black text-xl">
                                    C
                                </div>
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

                        {/* Profile Section */}
                        <div className="mb-8 p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setShowProfileEdit(true)}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-linear-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-2xl">
                                    {userProfile.avatar}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white">{userProfile.username}</p>
                                    <p className="text-xs text-zinc-400 truncate">{walletAddress.slice(0, 12)}...</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-500">Devnet</span>
                                <div className="flex items-center gap-1 text-orange-500">
                                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                                    Active
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 space-y-6 overflow-y-auto">
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
                                </div>
                            </div>

                            {/* MERCHANT Section */}
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 px-3">
                                    Business
                                </p>
                                <div className="space-y-1">
                                    <NavItem
                                        icon={<ReceiptIcon size={20} />}
                                        label="Receipts"
                                        active={activeSection === 'receipts'}
                                        onClick={() => { setActiveSection('receipts'); if (window.innerWidth < 768) setSidebarOpen(false); }}
                                    />
                                    <NavItem
                                        icon={<KeyIcon size={20} />}
                                        label="Developer Keys"
                                        active={activeSection === 'dev-keys'}
                                        onClick={() => { setActiveSection('dev-keys'); if (window.innerWidth < 768) setSidebarOpen(false); }}
                                    />


                                </div>
                            </div>
                        </nav>

                        {/* Logout */}
                        <button
                            onClick={logout}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        >
                            <SignOutIcon size={20} />
                            Logout
                        </button>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className={`${sidebarOpen ? 'ml-0 md:ml-72' : 'ml-0'} relative z-10 transition-all duration-300`}>
                <div className="p-4 sm:p-6 md:p-8 lg:p-12 pt-16 md:pt-20">
                    {activeSection === 'overview' && (
                        <OverviewSection
                            userName={userProfile.username}
                            balance={displayBalance}
                            address={walletAddress}
                            usdcBalance={usdcBalance}   // <-- Real Balance
                            refetchUsdc={refetchUsdc}   // <-- Refetch Function
                            refreshBalance={refreshBalance} // <-- Refresh Native Balance
                            loading={loading}
                            copyToClipboard={copyToClipboard}
                            onOpenSend={() => setShowSendModal(true)}
                            transactions={transactions}
                            fetchTransactions={fetchTransactions}
                        />
                    )}

                    {activeSection === 'subscriptions' && <SubscriptionsSection usdcBalance={usdcBalance} refetchUsdc={refetchUsdc} />}

                    {activeSection === 'wallet' && <WalletSection
                        balance={displayBalance}
                        address={walletAddress} copyToClipboard={copyToClipboard} />}
                    {activeSection === 'security' && <SecuritySettings />}
                    {activeSection === 'payment-link' && <PaymentLinkSection />}
                    {activeSection === 'receipts' && <ReceiptsSection />}
                    {activeSection === 'dev-keys' && <DevKeysSection />}
                    {activeSection === 'savings' && <SavingsSection />}
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
                isSubmitting={isOnboardingSubmitting}
                walletAddress={walletAddress}
                onComplete={handleOnboardingComplete}
            />

            <UnifiedSendModal
                isOpen={showSendModal}
                onClose={() => setShowSendModal(false)}
                onSend={handleUnifiedSend}
                pots={pots}
                balance={balance || 0}
            />
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
                                            ? 'bg-orange-500 text-white font-bold'
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
function OverviewSection({ userName, balance, address, usdcBalance, refetchUsdc, loading, copyToClipboard, onOpenSend, refreshBalance, transactions, fetchTransactions }: any) {
    const [showUSD, setShowUSD] = useState(true);
    const [kasPrice, setKasPrice] = useState<number | null>(null);
    const { subscriptions } = useSubscriptions();
    const [isFunding, setIsFunding] = useState(false);
    const { showToast } = useToast();

    // Fetch KAS price
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=kaspa&vs_currencies=usd');
                const data = await response.json();
                setKasPrice(data.kaspa.usd);
            } catch (error) {
                console.error('Failed to fetch KAS price:', error);
            }
        };
        fetchPrice();
    }, []);

    // Initial fetch for transactions
    useEffect(() => {
        if (address && fetchTransactions) {
            fetchTransactions();
        }
    }, [address, fetchTransactions]);

    const handleFundDemo = async () => {
        if (!address) return;
        setIsFunding(true);
        try {
            showToast("Requesting funds from Private Vault...", "info");
            const res = await fetch('/api/faucet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address })
            });
            const data = await res.json();

            if (data.success) {
                const fundingAmount = data.amount || 100;
                showToast(`Funding Successful! +${fundingAmount} KAS`, "success");

                // Update Local Demo Balance (for Biometric Wallet)
                // This helps reflect the change before the chain indexer picks it up
                const currentBal = parseFloat(localStorage.getItem(`demo_balance_${address}`) || '0');
                const newBal = currentBal + fundingAmount;
                localStorage.setItem(`demo_balance_${address}`, newBal.toString());

                // Refresh balance immediately (this now also refreshes transactions in useKasWare)
                if (refreshBalance) refreshBalance();
                if (fetchTransactions) fetchTransactions();

                // Refresh again after 2 seconds to catch blockchain confirmation
                setTimeout(() => {
                    if (refreshBalance) refreshBalance();
                    if (fetchTransactions) fetchTransactions();
                }, 2000);

                // Final refresh after 5 seconds for any slow confirmations
                setTimeout(() => {
                    if (refreshBalance) refreshBalance();
                    if (fetchTransactions) fetchTransactions();
                }, 5000);
            } else {
                showToast(data.error || "Faucet failed", "error");
            }
        } catch (e) {
            showToast("Faucet request failed", "error");
        } finally {
            setIsFunding(false);
        }
    };


    const pots: any[] = [];


    const balanceValue = parseFloat(balance) || 0;
    const usdValue = kasPrice ? (balanceValue * kasPrice).toFixed(2) : '...';

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold tracking-tight">Welcome back, {userName}! 👋</h1>
                <p className="text-zinc-400 mt-2">Here's what's happening with your account today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Balance Card */}
                <div className="md:col-span-2 flex justify-center w-full">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-linear-to-br from-orange-500/20 to-orange-600/10 backdrop-blur-md border border-orange-500/30 rounded-full aspect-square w-full max-w-[450px] p-12 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity flex items-center justify-center pointer-events-none">
                            <CurrencyDollarIcon size={300} />
                        </div>

                        <div className="relative z-10 w-full max-w-[320px]">
                            <div className="flex flex-col items-center mb-6">
                                <p className="text-[#70C7BA] text-xs font-bold uppercase tracking-widest mb-2">Kaspa Balance</p>
                                <div className="px-3 py-1 bg-[#70C7BA]/10 border border-[#70C7BA]/20 rounded-full">
                                    <span className="text-[10px] font-bold text-[#70C7BA]">PRIVATE VAULT</span>
                                </div>
                            </div>

                            <h2 className="text-4xl md:text-5xl font-black mb-2 text-white flex flex-col items-center">
                                <span className={balanceValue > 0 ? "text-[#70C7BA]" : "text-white"}>
                                    {balanceValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[#70C7BA]/60 text-xl font-normal">KAS</span>
                            </h2>

                            <div className="text-sm text-[#70C7BA]/60 mb-8 font-medium">
                                ≈ ${usdValue} USD
                            </div>

                            <div className="flex flex-col items-center gap-3">
                                <button
                                    onClick={handleFundDemo}
                                    disabled={loading || isFunding}
                                    className="w-full px-6 py-4 bg-white text-black rounded-full font-black text-xs hover:bg-orange-100 transition-all flex items-center justify-center gap-2"
                                >
                                    {isFunding ? (
                                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <PlusIcon weight="bold" />
                                    )}
                                    {isFunding ? 'Funding...' : 'Fund Wallet'}
                                </button>
                                <button
                                    onClick={onOpenSend}
                                    className="w-full px-6 py-4 bg-orange-500 text-white rounded-full font-black text-xs hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                                >
                                    <PaperPlaneTiltIcon size={16} weight="bold" />
                                    Send Funds
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Quick Stats & Savings (Only show if pots exist) */}
                <div className="space-y-4">
                    <StatCard title="Active Subscriptions" value={subscriptions.length.toString()} color="blue" />

                    {pots.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-zinc-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-5"
                        >
                            <p className="text-xs text-zinc-400 mb-3 flex items-center gap-2">
                                <PiggyBankIcon size={16} className="text-orange-400" />
                                Quick Save
                            </p>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                {pots.map((pot: any) => (
                                    <button
                                        key={pot.name}
                                        onClick={async () => {
                                            showToast(`Saving to ${pot.name} coming soon!`, 'info');
                                        }}
                                        className="w-full flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all group"
                                    >
                                        <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">{pot.name}</span>
                                        <div className="flex items-center gap-1">
                                            <PlusIcon size={12} className="text-orange-400" weight="bold" />
                                            <span className="text-[10px] font-bold text-orange-400"></span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Transaction History */}
            <div className="flex justify-center w-full">
                <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-full aspect-square w-full max-w-[400px] p-10 flex flex-col items-center justify-center text-center">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <ListIcon size={20} className="text-blue-500" />
                        Recent Activity
                    </h3>
                    <div className="space-y-3 max-h-52 overflow-y-auto w-full max-w-[280px] pr-2 custom-scrollbar">
                        {transactions.length === 0 ? (
                            <p className="text-zinc-500 text-xs text-center py-8">No transactions yet</p>
                        ) : (
                            transactions.map((tx: any) => (
                                <div key={tx.signature} className="flex items-center gap-3 p-3 bg-black/30 rounded-full border border-white/5">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.err ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                                        }`}>
                                        {tx.err ? <ArrowDownIcon size={14} /> : <ArrowUpIcon size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-[10px] font-medium text-white truncate">
                                            {tx.signature.slice(0, 15)}...
                                        </p>
                                    </div>
                                    <div className={`text-[10px] font-bold ${tx.err ? 'text-red-400' : 'text-orange-400'
                                        }`}>
                                        {tx.err ? 'Err' : 'OK'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Wallet Address Card */}
            <div className="flex justify-center w-full">
                <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-full aspect-square w-full max-w-[300px] flex flex-col items-center justify-center p-8 text-center">
                    <h3 className="text-[10px] font-black text-zinc-500 mb-6 uppercase tracking-widest">Smart Wallet</h3>
                    <div className="flex flex-col items-center gap-4 w-full">
                        <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center border border-orange-500/20">
                            <WalletIcon size={32} className="text-orange-500" />
                        </div>
                        <div className="bg-black/40 p-3 rounded-full border border-white/5 w-full flex items-center justify-between px-4">
                            <span className="font-mono text-[10px] text-zinc-300 truncate flex-1">{address.slice(0, 16)}...</span>
                            <button
                                onClick={() => navigator.clipboard.writeText(address)}
                                className="ml-2 text-zinc-500 hover:text-white transition-colors"
                            >
                                <CopyIcon size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, color }: { title: string; value: string; color: 'blue' | 'purple' }) {
    const colors = {
        blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
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
function SubscriptionsSection({ usdcBalance, refetchUsdc }: { usdcBalance: number, refetchUsdc: () => void }) {
    const [activeTab, setActiveTab] = useState<'browse' | 'active' | 'analytics'>('browse');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);
    const [solPrice, setSolPrice] = useState<number | null>(null);

    // Toast notifications
    const { showToast } = useToast();

    // @ts-ignore
    const { address, balance } = useKasWare();
    const { subscriptions, addSubscription, removeSubscription, getMonthlyTotal, getHistoricalData } = useSubscriptions();
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

    // Fetch SOL price
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=kaspa&vs_currencies=usd');
                const data = await response.json();
                setSolPrice(data.kaspa.usd);
            } catch (error) {
                console.error('Failed to fetch KAS price:', error);
            }
        };
        fetchPrice();
        const interval = setInterval(fetchPrice, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleServiceClick = (service: Service) => {
        setSelectedService(service);
        setShowSubscribeModal(true);
    };

    const handleSubscribe = async (serviceId: string, plan: SubscriptionPlan, email: string, price: number) => {
        try {
            if (!address) throw new Error("Wallet not connected");

            // STUB: Removed Solana subscription logic
            showToast("Subscriptions coming soon on Kaspa!", "info");

            // Allow demo subscription to proceed locally without blockchain tx
            const actualService = SERVICES.find(s => s.id === serviceId) || dynamicServices.find(s => s.id === serviceId);

            addSubscription({
                serviceId,
                serviceName: actualService ? actualService.name : serviceId,
                plan: plan.name,
                priceUSD: plan.priceUSD, // Use USD price for analytics
                email,
                color: actualService ? actualService.color : '#FF6B35',
                icon: (actualService ? actualService.icon : StorefrontIcon) as any,
                transactionSignature: "demo_sig_" + Date.now()
            });

            // Show success toast
            showToast(`Successfully subscribed to ${actualService?.name || serviceId}! 🎉`, 'success');
            setShowSubscribeModal(false);
        } catch (error: any) {
            console.error("Subscription failed:", error);
            showToast("Subscription failed", "error");
        }
    };

    const categoryCount = (cat: string) => {
        if (cat === 'all') return allServices.length;
        return allServices.filter(s => s.category === cat).length;
    };

    const filteredServices = allServices.filter(s => {
        if (categoryFilter === 'all') return true;
        return s.category === categoryFilter;
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

            {/* Browse Tab */}
            {activeTab === 'browse' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                    {/* Left Column: Subscriptions List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <StorefrontIcon size={24} className="text-orange-500" />
                                <span className="whitespace-nowrap">Your Subscriptions</span>
                            </h2>
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

                        {/* Service Cards Grid - Mobile: 2 cols, Desktop: 3 cols */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 justify-items-center">
                            {filteredServices.map(service => (
                                <ServiceCard
                                    key={service.id}
                                    service={service}
                                    onClick={() => handleServiceClick(service)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Stats & Analytics */}
                    <div className="space-y-6">
                        {/* Spending Analytics Chart */}
                        <div className="flex justify-center">
                            <div className="bg-zinc-900/50 border border-white/10 rounded-full p-10 backdrop-blur-xl aspect-square w-full max-w-[400px] flex flex-col items-center justify-center text-center">
                                <div className="mb-6">
                                    <h3 className="font-bold text-white">Spending Activity</h3>
                                    <p className="text-xs text-zinc-400">Past 6 Months</p>
                                    <div className="mt-2">
                                        <p className="text-3xl font-black text-white">$365</p>
                                        <p className="text-xs text-green-400 font-bold">+12% vs last mo</p>
                                    </div>
                                </div>

                                <div className="h-40 w-full max-w-[280px]">
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
                                            <Bar dataKey="amount" radius={[4, 4, 4, 4]}>
                                                {spendingData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 5 ? '#f97316' : '#27272a'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <div className="bg-zinc-900/50 border border-white/10 rounded-full p-10 backdrop-blur-xl aspect-square w-full max-w-[400px] flex flex-col items-center justify-center text-center sticky top-8">
                                <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                                    <WalletIcon size={20} className="text-blue-500" />
                                    Monthly Overview
                                </h3>

                                <div className="space-y-6 w-full max-w-[280px]">
                                    <div className="p-6 rounded-full aspect-square bg-black/40 border border-white/5 flex flex-col justify-center items-center">
                                        <p className="text-zinc-500 text-[10px] font-bold uppercase">Budget</p>
                                        <p className="text-xl font-bold text-white">$250.00</p>
                                        <div className="mt-2 w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                            <span className="text-[10px] font-bold text-zinc-400">75%</span>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-full aspect-square bg-black/40 border border-white/5 flex flex-col justify-center items-center">
                                        <p className="text-zinc-500 text-[10px] font-bold uppercase mb-1">Gas Saved</p>
                                        <p className="text-lg font-bold text-green-400">0.024 KAS</p>
                                        <div className="w-full max-w-[60px] bg-zinc-800 h-1 rounded-full mt-2 overflow-hidden mx-auto">
                                            <div className="bg-green-500 h-full w-[85%]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
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
                                        {solPrice && (
                                            <p className="text-sm text-orange-200/40 mt-1">
                                                ≈ {(getMonthlyTotal() / solPrice).toFixed(2)} KAS
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
            )}

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
                                                {typeof sub.icon === 'function' ? (
                                                    <sub.icon size={24} />
                                                ) : (
                                                    <StorefrontIcon size={24} />
                                                )}
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
                kasPrice={solPrice}
                existingSubscriptions={subscriptions}
            />
        </div>
    );
}

// Wallet Section
function WalletSection({ balance, address, copyToClipboard }: any) {
    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold">Wallet & Cards</h1>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-linear-to-br from-zinc-900/80 to-black/60 backdrop-blur-md border border-white/10 rounded-3xl p-8">
                    <h3 className="text-lg font-bold mb-6">Main Wallet</h3>
                    <p className="text-4xl font-bold mb-6">{balance} KAS</p>
                    <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/5 text-sm">
                        <span className="font-mono text-zinc-300 truncate">{address}</span>
                        <button onClick={copyToClipboard} className="text-orange-500 ml-3">
                            <CopyIcon size={18} />
                        </button>
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
function ReceiptsSection() {
    const { address } = useKasWare();
    const { receipts, loading, totalSpending, totalSpendingUSD } = useReceipts(address);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold">Receipts</h1>
                    <p className="text-zinc-400 mt-2">View all your subscription payment receipts</p>
                </div>

                {receipts.length > 0 && (
                    <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-4">
                        <p className="text-xs text-zinc-400 mb-1">Total Spent</p>
                        <p className="text-2xl font-bold text-[#70C7BA]">{totalSpending.toFixed(2)} KAS</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
                    {receipts.map(receipt => (
                        <motion.div
                            key={receipt.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-full aspect-square w-full max-w-[280px] p-8 flex flex-col items-center justify-center text-center group hover:border-orange-500/30 transition-all relative overflow-hidden"
                        >
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${receipt.status === 'completed'
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

                            <div className="space-y-1 mb-4">
                                <h3 className="text-lg font-bold text-white truncate max-w-[200px]">{receipt.service_name}</h3>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{receipt.plan_name} Plan</p>
                            </div>

                            <div className="mb-4">
                                <p className="text-xl font-black text-white">
                                    {receipt.amount_kas.toFixed(0)} KAS
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                    {new Date(receipt.timestamp).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 bg-black/60 backdrop-blur-sm items-center justify-center z-20">
                                <button
                                    onClick={() => {
                                        window.open(
                                            `https://explorer.kaspa.org/txs/${receipt.tx_signature}?testnet=true`,
                                            '_blank'
                                        );
                                    }}
                                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                                    title="View on Explorer"
                                >
                                    <LinkIcon size={20} />
                                </button>
                                <button
                                    onClick={() => {
                                        // Generate downloadable receipt
                                        const receiptText = `
CadPay Subscription Receipt
============================
Service: ${receipt.service_name}
Plan: ${receipt.plan_name}
Amount: ${receipt.amount_kas.toFixed(2)} KAS (≈ $${receipt.amount_usd.toFixed(2)} USD)
Transaction: ${receipt.tx_signature}
Date: ${new Date(receipt.timestamp).toLocaleString()}
Status: ${receipt.status}
Merchant: ${receipt.merchant_wallet}
============================
                                        `.trim();

                                        const blob = new Blob([receiptText], { type: 'text/plain' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `receipt-${receipt.service_name.toLowerCase()}-${receipt.id.slice(0, 8)}.txt`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                    className="p-3 bg-orange-500 hover:bg-orange-600 rounded-full text-white transition-colors"
                                    title="Download Receipt"
                                >
                                    <DownloadIcon size={20} />
                                </button>
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
function SavingsSection() {
    // @ts-ignore
    const { pots, createPot, withdrawFromPot, loading, fetchPots } = useLazorkit();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreatePot = async (name: string, durationMonths: number) => {
        setIsCreating(true);
        try {
            // Calculate unlock time
            const unlockDate = new Date();
            unlockDate.setMonth(unlockDate.getMonth() + durationMonths);
            const timestamp = Math.floor(unlockDate.getTime() / 1000);

            await createPot(name, timestamp);
            setShowCreateModal(false);
        } catch (e) {
            console.error("Failed to create pot", e);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-8">
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
                    {pots.map((pot: any) => (
                        <SavingsPotView
                            key={pot.name}
                            pot={pot}
                            onWithdraw={(recipient, amount, note) => withdrawFromPot(pot.address, recipient, amount, note)}
                            onRefresh={fetchPots}
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
        </div>
    );
}
