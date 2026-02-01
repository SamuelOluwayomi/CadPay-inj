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
    PaperPlaneTiltIcon
} from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import LogoField from '@/components/shared/LogoField';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { SERVICES, CATEGORIES, Service, SubscriptionPlan } from '@/data/subscriptions';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import ServiceCard from '@/components/subscriptions/ServiceCard';
import SubscribeModal from '@/components/subscriptions/SubscribeModal';
import ActiveSubscriptionCard from '@/components/subscriptions/ActiveSubscriptionCard';
import SecuritySettings from '@/components/security/SecuritySettings';
import FullProfileEditModal from '@/components/shared/FullProfileEditModal';
import OnboardingModal from '@/components/shared/OnboardingModal';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { constructMintTransaction, constructTransferTransaction, DEMO_MERCHANT_WALLET, ensureMerchantHasATA } from '@/utils/cadpayToken';
import CopyButton from '@/components/shared/CopyButton';
import { useMerchant } from '@/context/MerchantContext';
import CreateSavingsModal from '@/components/shared/CreateSavingsModal';
import SavingsPotView from '@/components/shared/SavingsPotView';
import UnifiedSendModal from '@/components/shared/UnifiedSendModal';
import { useToast } from '@/context/ToastContext';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, ASSOCIATED_TOKEN_PROGRAM_ID, createTransferInstruction } from '@solana/spl-token';
import { CADPAY_MINT } from '@/utils/cadpayToken';
import { deriveSavingsPotPDA } from '@/utils/savingsAccounts';
import idl from '../../../anchor/target/idl/cadpay_profiles.json';
import { createMemoInstruction } from '@solana/spl-memo';

type NavSection = 'overview' | 'subscriptions' | 'wallet' | 'security' | 'payment-link' | 'invoices' | 'dev-keys' | 'savings';

export default function Dashboard() {
    const { address, wallet, loading, balance, requestAirdrop, logout, signAndSendTransaction, connection, pots, fetchPots, refreshBalance, createPot } = useLazorkit();
    const { showToast } = useToast();
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
        if (!address || !signAndSendTransaction) {
            showToast("Wallet not connected", "error");
            return;
        }

        try {
            const tx = new Transaction();

            if (isSavings) {
                // Determine pot name from address (we've stored metadata)
                const pot = pots.find(p => p.address === recipient);
                if (!pot) throw new Error("Saving pot not found");

                // Validate amount
                if (!amount || isNaN(amount) || amount <= 0) {
                    throw new Error(`Invalid amount: ${amount}. Please enter a valid positive number.`);
                }

                // Convert to raw amount (6 decimals for USDC)
                const rawAmount = Math.floor(amount * 1_000_000);
                if (rawAmount <= 0 || !Number.isFinite(rawAmount)) {
                    throw new Error(`Invalid amount calculation: ${amount} * 1_000_000 = ${rawAmount}`);
                }

                console.log(`💰 Depositing ${amount} USDC (${rawAmount} raw) to pot "${pot.name}"`);

                // Check if this is a wallet-based pot
                const isWalletBased = pot.isWalletBased === true;

                // For wallet-based pots, use the address directly; for PDA-based, derive PDA
                let potAddress: PublicKey;
                if (isWalletBased && pot.address) {
                    // Wallet-based: use the stored address directly
                    potAddress = new PublicKey(pot.address);
                } else {
                    // PDA-based: derive the PDA
                    const [potPda] = deriveSavingsPotPDA(new PublicKey(address), pot.name);
                    if (!potPda) {
                        throw new Error(`Failed to derive pot PDA for pot "${pot.name}"`);
                    }
                    potAddress = potPda;
                }

                const userAta = await getAssociatedTokenAddress(CADPAY_MINT, new PublicKey(address), true);
                if (!userAta) {
                    throw new Error(`Failed to derive user ATA`);
                }

                const potAta = await getAssociatedTokenAddress(CADPAY_MINT, potAddress, true);
                if (!potAta) {
                    throw new Error(`Failed to derive pot ATA`);
                }

                try {
                    const potAtaInfo = await connection.getAccountInfo(potAta);
                    if (!potAtaInfo) {
                        showToast(`Initializing savings account for "${pot.name}"...`, 'info');
                        const createAtaTx = new Transaction().add(
                            createAssociatedTokenAccountInstruction(
                                (wallet as any)?.publicKey || new PublicKey(address), // payer - MUST be the signer (EOA), not the Smart Wallet PDA
                                potAta, // ata
                                potAddress, // owner
                                CADPAY_MINT, // mint
                                TOKEN_PROGRAM_ID,
                                ASSOCIATED_TOKEN_PROGRAM_ID
                            )
                        );
                        // Send ATA creation in separate transaction to keep deposit tx small
                        const ataSignature = await signAndSendTransaction(createAtaTx);

                        // CRITICAL: Wait for confirmation before proceeding
                        try {
                            await connection.confirmTransaction(ataSignature, 'confirmed');
                            console.log(`✅ ATA creation confirmed: ${ataSignature}`);
                        } catch (confirmError) {
                            console.warn('ATA confirmation timeout, waiting additional time...');
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        }

                        // Verify the ATA now exists before proceeding
                        const verifyAtaInfo = await connection.getAccountInfo(potAta);
                        if (!verifyAtaInfo) {
                            throw new Error(`ATA creation transaction sent but account not found. Please try depositing again in a few seconds.`);
                        }

                        showToast(`Savings account initialized for "${pot.name}"`, 'success');
                    }
                } catch (ataError: any) {
                    console.error('ATA pre-creation failed:', ataError);
                    throw new Error(`Failed to initialize savings account: ${ataError?.message || 'Unknown error'}. Please try again.`);
                }

                // For wallet-based pots, skip PDA verification (they're just regular wallet addresses)
                if (!isWalletBased) {
                    // Only verify PDA-based pots exist on-chain
                    try {
                        const potAccountInfo = await connection.getAccountInfo(potAddress);
                        if (!potAccountInfo) {
                            // PDA pot doesn't exist on-chain, try to create it automatically
                            const unlockTime = pot.unlockTime || Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
                            try {
                                showToast(`Creating savings pot "${pot.name}" on-chain...`, 'info');
                                await createPot(pot.name, unlockTime);
                                showToast(`Savings pot "${pot.name}" created! You can now deposit.`, 'success');
                                // Wait a moment for the account to be available
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                // Re-check the account
                                const recheckInfo = await connection.getAccountInfo(potAddress);
                                if (!recheckInfo) {
                                    throw new Error(`Pot was created but account is not yet available. Please try again in a few seconds.`);
                                }
                            } catch (createError: any) {
                                throw new Error(`Savings pot "${pot.name}" does not exist on-chain and failed to create: ${createError?.message || 'Unknown error'}. Please create it manually first.`);
                            }
                        }
                    } catch (accountCheckError: any) {
                        throw new Error(`Failed to verify pot account: ${accountCheckError?.message || 'Unknown error'}`);
                    }
                } else {
                    // For wallet-based pots, just verify the wallet exists (it should, since we funded it)
                    const walletInfo = await connection.getAccountInfo(potAddress);
                    if (!walletInfo) {
                        throw new Error(`Savings pot wallet "${pot.name}" not found. Please create the pot first.`);
                    }
                }

                // For wallet-based pots, use simple token transfer; for PDA-based, use Anchor program
                const userPubkey = new PublicKey(address);

                if (isWalletBased) {
                    // Wallet-based: Simple token transfer (no Anchor program needed)
                    const transferIx = createTransferInstruction(
                        userAta,
                        potAta,
                        userPubkey,
                        rawAmount
                    );
                    tx.add(transferIx);
                } else {
                    // PDA-based: Use Anchor program for deposit
                    const provider = new AnchorProvider(connection, (wallet as any), {});
                    const program = new Program(idl as any, provider);

                    // Ensure BN is properly imported and amount is valid
                    let depositAmount;
                    try {
                        depositAmount = new BN(rawAmount);
                        if (!depositAmount || (depositAmount as any)._bn === undefined) {
                            depositAmount = new BN(rawAmount.toString());
                        }
                    } catch (bnError: any) {
                        throw new Error(`Failed to create BN: ${bnError?.message || 'Unknown error'}`);
                    }

                    let depositIx;
                    try {
                        depositIx = await program.methods
                            .depositToPot(depositAmount)
                            .accounts({
                                savingsPot: potAddress,
                                user: userPubkey,
                                userAta: userAta,
                                potAta: potAta,
                                tokenProgram: TOKEN_PROGRAM_ID,
                            })
                            .instruction();
                    } catch (ixError: any) {
                        throw new Error(`Failed to create deposit instruction: ${ixError?.message || 'Unknown error'}`);
                    }
                    tx.add(depositIx);
                }

                // Add memo with STRICT 20-character limit to minimize transaction size
                // Each character = ~1 byte, so 20 chars + overhead = ~25 bytes total
                if (memo && memo.trim().length > 0) {
                    const trimmedMemo = memo.trim().slice(0, 20); // Hard limit at 20 characters
                    try {
                        const memoIx = createMemoInstruction(trimmedMemo, [userPubkey]);
                        tx.add(memoIx);
                    } catch (memoError: any) {
                        // If memo fails, log but don't fail the transaction
                        console.warn('Failed to add memo instruction:', memoError);
                    }
                }
            } else {
                const transferInstructions = await constructTransferTransaction(address, amount * 1_000_000, recipient);
                tx.add(...transferInstructions);

                // Add memo for external transfers if provided (with size limit)
                if (memo && memo.trim().length > 0 && memo.length <= 50) {
                    try {
                        const { createMemoInstruction } = await import('@solana/spl-memo');
                        const memoIx = createMemoInstruction(memo.trim(), [new PublicKey(address)]);
                        tx.add(memoIx);
                    } catch (memoError: any) {
                        console.warn('Failed to add memo instruction:', memoError);
                    }
                }
            }

            // OPTIMIZATION: Use Lazorkit's instruction-based API to reduce transaction size
            // Extract instructions from transaction and pass directly (avoids extra serialization overhead)
            // This is critical for smart wallets which add wrapper instructions
            const allInstructions = tx.instructions;

            // Fetch Address Lookup Table for transaction compression (reduces account size from 32 bytes to 1 byte)
            let lookupTableAccount = null;
            try {
                // Use a reliable public lookup table or the one from env
                const lookupTableAddress = new PublicKey(process.env.NEXT_PUBLIC_LOOKUP_TABLE_ADDRESS || '3yf26dUdvL6TYbRbvpCvdWU8JjL6AwjuXMcYiigmAB2D');
                const lookupTableResult = await connection.getAddressLookupTable(lookupTableAddress);
                lookupTableAccount = lookupTableResult.value;
                if (lookupTableAccount) console.log("✅ Using ALT for compression:", lookupTableAddress.toBase58());
            } catch (altError) {
                // ALT not critical (will fallback to large tx), but highly recommended
                console.warn('Failed to fetch Address Lookup Table:', altError);
            }

            // Sign and send using instruction-based API (more efficient for smart wallets)
            // This reduces transaction size by avoiding Transaction object serialization overhead
            const signature = await signAndSendTransaction({
                instructions: allInstructions,
                transactionOptions: {
                    computeUnitLimit: isSavings ? 300_000 : 400_000, // Lower limit for savings (no memo logic overhead)
                    addressLookupTableAccounts: lookupTableAccount ? [lookupTableAccount] : undefined,
                }
            });

            showToast(`USDC ${isSavings ? 'saved' : 'sent'} successfully! Signature: ${signature.slice(0, 8)}...`, 'success');

            // Wait for transaction confirmation before refreshing balance
            try {
                await connection.confirmTransaction(signature, 'confirmed');
            } catch (confirmError) {
                // Transaction might still be processing, continue anyway
                console.log('Transaction confirmation:', confirmError);
            }

            // Revert Split Transaction Logic - Memo is now integrated


            // Refresh UI immediately and then again after a short delay for real-time updates
            await fetchPots();
            await refreshBalance();
            await refetchUsdc();

            // Additional refresh after 2 seconds to catch any delayed updates
            setTimeout(async () => {
                await refetchUsdc();
                await refreshBalance();
            }, 2000);
        } catch (e: any) {
            showToast(`Transfer failed: ${e.message || 'Unknown error'}`, 'error');
            throw e;
        }
    };

    // Use Real On-Chain Balance
    const { balance: usdcBalance, refetch: refetchUsdc } = useUSDCBalance(address);

    useEffect(() => {
        if (loading || profileLoading) return;
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
                    `Profile created on-chain — tx ${signature.slice(0, 8)}...`,
                    'success'
                );
                // Also log a full link for manual inspection
                console.log('Profile creation tx:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
            } else {
                showToast("Profile created on-chain!", "success");
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
                                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
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
                                        label="Invoices"
                                        active={activeSection === 'invoices'}
                                        onClick={() => { setActiveSection('invoices'); if (window.innerWidth < 768) setSidebarOpen(false); }}
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
                            loading={loading}
                            copyToClipboard={copyToClipboard}
                            onOpenSend={() => setShowSendModal(true)}
                        />
                    )}

                    {activeSection === 'subscriptions' && <SubscriptionsSection usdcBalance={usdcBalance} refetchUsdc={refetchUsdc} />}

                    {activeSection === 'wallet' && <WalletSection
                        balance={displayBalance}
                        address={walletAddress} copyToClipboard={copyToClipboard} />}
                    {activeSection === 'security' && <SecuritySettings />}
                    {activeSection === 'payment-link' && <PaymentLinkSection />}
                    {activeSection === 'invoices' && <InvoicesSection />}
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
                usdcBalance={usdcBalance}
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${active
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
function OverviewSection({ userName, balance, address, usdcBalance, refetchUsdc, loading, copyToClipboard, onOpenSend }: any) {
    const [showUSD, setShowUSD] = useState(true);
    const [solPrice, setSolPrice] = useState<number | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const { subscriptions } = useSubscriptions();
    const [isFunding, setIsFunding] = useState(false);
    const { showToast } = useToast();

    // @ts-ignore
    const { wallet, connection, pots, fetchPots, signAndSendTransaction, refreshBalance } = useLazorkit();

    const handleFundDemo = async () => {
        setIsFunding(true);
        try {
            if (!address) return;

            // 1. Construct REAL Mint Transaction (Signed by Authority)
            // Explicitly mint 50 USDC (50 * 1_000_000 with 6 decimals)
            const mintAmount = 50 * 1_000_000; // 50 USDC
            console.log(`💰 Minting ${mintAmount / 1_000_000} USDC to ${address}`);
            const { sendTransaction } = await constructMintTransaction(address, mintAmount);

            // 2. Send directly (User does not need to sign!)
            const signature = await sendTransaction();
            console.log(`✅ Mint transaction sent: ${signature}`);

            // 3. Wait for confirmation and update UI immediately
            try {
                const conn = await (await import('@/utils/rpc')).createConnectionWithRetry();
                await conn.confirmTransaction(signature, 'confirmed');
                console.log(`✅ Mint transaction confirmed: ${signature}`);
            } catch (confirmError) {
                console.log('Transaction confirmation:', confirmError);
            }

            // Immediate parallel refresh - update all balances concurrently for faster UI update
            await Promise.all([
                refetchUsdc(),
                refreshBalance()
            ]);

            // Quick second refresh after shorter delay to catch any processing delays
            setTimeout(async () => {
                await Promise.all([
                    refetchUsdc(),
                    refreshBalance()
                ]);
            }, 1500); // Reduced from 3000ms to 1500ms for faster updates

            // Add REAL transaction to history
            const newTx = {
                signature: signature || "tx_" + Date.now(),
                err: null,
                blockTime: Math.floor(Date.now() / 1000),
                memo: "CadPay USDC Access Grant"
            };
            setTransactions(prev => [newTx, ...prev]);
        } catch (error) {
            console.error("Funding failed", error);
        } finally {
            setIsFunding(false);
        }
    };



    // Fetch SOL price from CoinGecko
    useEffect(() => {
        const fetchSolPrice = async () => {
            try {
                const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
                if (!response.ok) return; // Silent fail
                const data = await response.json();
                setSolPrice(data.solana.usd);
            } catch (error) {
                // console.error('Failed to fetch SOL price:', error);
            }
        };
        fetchSolPrice();
        // Refresh price every 60 seconds (throttled)
        const interval = setInterval(fetchSolPrice, 60000);
        return () => clearInterval(interval);
    }, []);

    // Fetch transaction history
    useEffect(() => {
        const fetchTransactions = async () => {
            if (!address || address === 'Loading...') return;
            try {
                // Use shared connection if available, else fallback with robust error handling
                let conn;
                try {
                    conn = connection || new Connection(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
                } catch (connError) {
                    console.warn('Failed to create specific connection, falling back to public devnet:', connError);
                    conn = new Connection('https://api.devnet.solana.com', 'confirmed');
                }
                const pubkey = new PublicKey(address);
                const signatures = await conn.getSignaturesForAddress(pubkey, { limit: 10 });
                setTransactions(prev => {
                    // Merge real signatures with simulated ones, keeping simulated ones at top if recent
                    const realTxs = signatures;
                    const existingSigs = new Set(realTxs.map((tx: any) => tx.signature));
                    const keptSimulated = prev.filter(tx => tx.signature.startsWith('funding_') && !existingSigs.has(tx.signature));
                    return [...keptSimulated, ...realTxs];
                });
            } catch (error) {
                // console.error('Failed to fetch transactions:', error);
            }
        };
        fetchTransactions();
        // Refresh every 10 seconds
        const interval = setInterval(fetchTransactions, 10000);
        return () => clearInterval(interval);
    }, [address, connection]);

    const balanceValue = usdcBalance || 0;
    const usdValue = balanceValue.toFixed(2);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold tracking-tight">Welcome back, {userName}! 👋</h1>
                <p className="text-zinc-400 mt-2">Here's what's happening with your account today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Balance Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:col-span-2 bg-linear-to-br from-orange-500/20 to-orange-600/10 backdrop-blur-md border border-orange-500/30 rounded-3xl p-8 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CurrencyDollarIcon size={150} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-orange-200 text-sm">USDC Balance</p>
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
                                <span className="text-[10px] font-bold text-orange-400">GASLESS ENABLED</span>
                            </div>
                        </div>
                        <h2 className="text-5xl font-bold mb-2 text-white">
                            <span className={usdcBalance > 0 ? "text-[#FF8C33]" : "text-white"}>
                                ${usdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-orange-300/60 text-2xl font-normal ml-2">USDC</span>
                        </h2>
                        <div className="flex items-center gap-2 mb-4 text-xs text-orange-200/60">
                            <div className="flex items-center gap-1.5">
                                <span>SOL: {balance}</span>
                                <span className="px-2 py-0.5 bg-zinc-900/50 border border-orange-500/20 rounded text-[10px] font-bold text-orange-400">NOT NEEDED</span>
                            </div>
                        </div>
                        <p className="text-xs text-orange-200/60 mb-6">
                            Paymaster covers all network fees • You only need USDC to transact
                        </p>
                        <div className="flex flex-wrap items-center gap-4">
                            <button
                                onClick={handleFundDemo}
                                disabled={loading || isFunding}
                                className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-orange-100 transition-all hover:scale-105 disabled:opacity-50"
                            >
                                {isFunding ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        Funding...
                                    </>
                                ) : (
                                    <>
                                        <PlusIcon weight="bold" /> Add USDC
                                    </>
                                )}
                            </button>

                            <button
                                onClick={onOpenSend}
                                className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white border border-orange-400/30 rounded-xl font-bold hover:bg-orange-600 transition-all hover:scale-105 shadow-lg shadow-orange-500/20"
                            >
                                <PaperPlaneTiltIcon weight="bold" /> Send Funds
                            </button>
                        </div>
                    </div>
                </motion.div>

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
                                            if (!address) return;
                                            try {
                                                const { AnchorProvider, Program, BN } = await import('@coral-xyz/anchor');
                                                const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
                                                const { CADPAY_MINT } = await import('@/utils/cadpayToken');
                                                const { deriveSavingsPotPDA } = await import('@/utils/savingsAccounts');
                                                const idl = await import('@/../anchor/target/idl/cadpay_profiles.json');

                                                const [potPda] = deriveSavingsPotPDA(new PublicKey(address), pot.name);
                                                const userAta = await getAssociatedTokenAddress(CADPAY_MINT, new PublicKey(address), true);
                                                const potAta = await getAssociatedTokenAddress(CADPAY_MINT, potPda, true);

                                                const provider = new AnchorProvider(connection, (wallet as any), {});
                                                const program = new Program(idl as any, provider);

                                                // Quick save 1 USDC - ensure BN is created properly
                                                const quickSaveAmount = 1 * 1_000_000; // 1 USDC in raw units
                                                const quickSaveBN = new BN(quickSaveAmount.toString());

                                                const tx = await program.methods
                                                    .depositToPot(quickSaveBN)
                                                    .accounts({
                                                        savingsPot: potPda,
                                                        user: new PublicKey(address),
                                                        userAta: userAta,
                                                        potAta: potAta,
                                                        tokenProgram: TOKEN_PROGRAM_ID,
                                                    })
                                                    .transaction();

                                                // Don't set blockhash manually - Lazorkit's signAndSendTransaction handles it
                                                // Setting it here can cause "TransactionTooOld" errors if there's any delay
                                                // Lazorkit will fetch a fresh blockhash when signing

                                                tx.feePayer = new PublicKey(address);

                                                await signAndSendTransaction(tx);
                                                fetchPots();
                                                refreshBalance();
                                                refetchUsdc();
                                                showToast(`1 USDC saved to ${pot.name}`, 'success');
                                            } catch (e) {
                                                console.error("Quick transfer failed", e);
                                                showToast("Quick save failed", "error");
                                            }
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
            <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {transactions.length === 0 ? (
                        <p className="text-zinc-500 text-sm text-center py-8">No transactions yet</p>
                    ) : (
                        transactions.map((tx, i) => (
                            <div key={tx.signature} className="flex items-center gap-3 p-3 bg-black/30 rounded-xl border border-white/5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.err ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                                    }`}>
                                    {tx.err ? <ArrowDownIcon size={16} /> : <ArrowUpIcon size={16} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        {tx.signature.slice(0, 20)}...{tx.signature.slice(-20)}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                        {new Date((tx.blockTime || 0) * 1000).toLocaleString()}
                                    </p>
                                </div>
                                <div className={`text-xs font-medium ${tx.err ? 'text-red-400' : 'text-orange-400'
                                    }`}>
                                    {tx.err ? 'Failed' : 'Success'}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Wallet Address Card */}
            <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase tracking-wider">Your Smart Wallet</h3>
                <div className="flex items-center justify-between bg-black/30 p-4 rounded-xl border border-white/5">
                    <span className="font-mono text-sm text-zinc-200 truncate flex-1">{address}</span>
                    <CopyButton text={address} />
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
        <div className={`bg-linear-to-br ${colors[color]} backdrop-blur-md border rounded-2xl p-5`}>
            <p className="text-xs text-zinc-400 mb-1">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
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
    const { balance, signAndSendTransaction, address } = useLazorkit();
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
                price: ds.price,
                icon: StorefrontIcon, // Default icon for dynamic services
                color: ds.color,
                category: 'other' as const, // Default category
                features: ['Unified Billing', 'Gasless Payments', 'Instant Access'],
                plans: [{
                    name: 'Standard',
                    price: ds.price,
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
                const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
                const data = await response.json();
                setSolPrice(data.solana.usd);
            } catch (error) {
                console.error('Failed to fetch SOL price:', error);
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

            // 1. Find the Merchant Wallet for this service
            let targetMerchantAddress = DEMO_MERCHANT_WALLET.toString();

            // Check if it's a dynamic service
            const dynamicService = dynamicServices.find(s => s.id === serviceId);
            if (dynamicService) {
                const merchant = merchants.find(m => m.id === dynamicService.merchantId);
                if (merchant) {
                    targetMerchantAddress = merchant.walletPublicKey;
                    // Found dynamic merchant
                }
            }

            // Processing subscription

            // 2. Ensure Merchant Has ATA (System-sponsored if needed)
            try {
                await ensureMerchantHasATA(targetMerchantAddress);
            } catch (ensureError: any) {
                throw ensureError;
            }

            // 3. Construct the transfer and memo instructions
            const instructions = await constructTransferTransaction(
                address,
                price * 1_000_000,
                targetMerchantAddress,
                selectedService?.name || 'Unknown Service',
                plan.name
            );

            // 3.5. Fetch Address Lookup Table for transaction compression
            const lookupTableAddress = new PublicKey(process.env.NEXT_PUBLIC_LOOKUP_TABLE_ADDRESS || '3yf26dUdvL6TYbRbvpCvdWU8JjL6AwjuXMcYiigmAB2D');
            const connection = await (await import('@/utils/rpc')).createConnectionWithRetry();
            const lookupTableAccount = await connection.getAddressLookupTable(lookupTableAddress)
                .then((res) => res.value);

            // 4. User signs and sends transaction using Lazorkit's instruction-based API with ALT
            const signature = await signAndSendTransaction({
                instructions: instructions, // Now includes both memo and transfer
                transactionOptions: {
                    computeUnitLimit: 400_000, // Increased from 200k to handle larger transactions
                    addressLookupTableAccounts: lookupTableAccount ? [lookupTableAccount] : undefined,
                }
            });
            // Transaction completed

            // 5. Update local state
            // Find the actual service from SERVICES or dynamic services
            const actualService = SERVICES.find(s => s.id === serviceId) || dynamicService;

            addSubscription({
                serviceId,
                serviceName: actualService ? actualService.name : serviceId,
                plan: plan.name,
                price,
                email,
                color: actualService ? actualService.color : '#FF6B35',
                icon: (actualService ? actualService.icon : StorefrontIcon) as any,
                transactionSignature: signature // Store transaction ID
            });

            // 5. Refetch Balances
            setTimeout(refetchUsdc, 2000);

            // Show success toast
            showToast(`Successfully subscribed to ${actualService?.name || serviceId}! 🎉`, 'success');

            setShowSubscribeModal(false);
        } catch (error: any) {
            console.error("Subscription failed:", error);

            // Check for TransactionTooOld error
            if (error?.message?.includes('0x1783') || error?.message?.includes('TransactionTooOld')) {
                throw new Error("Transaction expired. This usually means your system clock is out of sync. Please check your date/time settings and try again.");
            }

            throw error; // Propagate to modal
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
                <div className="hidden md:flex flex-wrap gap-2 bg-zinc-900/50 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('browse')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'browse' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white'
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

                        {/* Service Cards Grid - Mobile: 2 cols, Desktop: 2 cols */}
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
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
                        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-bold text-white">Spending Activity</h3>
                                    <p className="text-xs text-zinc-400">Past 6 Months</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-white">$365</p>
                                    <p className="text-xs text-green-400 font-bold">+12% vs last mo</p>
                                </div>
                            </div>

                            <div className="h-48 w-full min-h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={spendingData}>
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#71717a', fontSize: 10 }}
                                            dy={10}
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

                        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl sticky top-8">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                <WalletIcon size={20} className="text-blue-500" />
                                Monthly Overview
                            </h3>

                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex justify-between items-center">
                                    <div>
                                        <p className="text-zinc-500 text-xs font-bold uppercase">Total Budget</p>
                                        <p className="text-lg font-bold text-white">$250.00</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                        <span className="text-xs font-bold text-zinc-400">75%</span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                                    <div className="flex justify-between items-end mb-2">
                                        <p className="text-zinc-500 text-xs font-bold uppercase">Estimated Gas Saved</p>
                                        <p className="text-lg font-bold text-green-400">0.024 SOL</p>
                                    </div>
                                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-green-500 h-full w-[85%]" />
                                    </div>
                                    <p className="text-[10px] text-zinc-500 mt-2 text-right">Lazorkit covers 100% of network fees</p>
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
                                                ≈ {(getMonthlyTotal() / solPrice).toFixed(4)} SOL
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
                                                <p className="text-sm font-bold text-white">${sub.price}</p>
                                                <p className="text-xs text-zinc-500">
                                                    {((sub.price / getMonthlyTotal()) * 100).toFixed(0)}%
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
                                    ? `$${Math.max(...subscriptions.map(s => s.price)).toFixed(2)}`
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
                usdcBalance={usdcBalance}
                solPrice={solPrice}
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
                    <p className="text-4xl font-bold mb-6">{balance} SOL</p>
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
                <p className="text-zinc-400 mb-6">Generate payment links to receive SOL payments</p>
                <button className="px-8 py-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all flex items-center gap-2">
                    <PlusIcon weight="bold" size={20} /> Create New Payment Link
                </button>
            </div>
        </div>
    );
}

// Invoices Section
function InvoicesSection() {
    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold">Invoices</h1>
            <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-12 text-center">
                <CreditCardIcon size={64} className="mx-auto mb-4 text-zinc-600" />
                <p className="text-zinc-400">No invoices yet</p>
            </div>
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
