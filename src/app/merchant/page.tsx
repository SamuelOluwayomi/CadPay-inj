'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    WalletIcon, TrendUpIcon, UsersIcon, LightningIcon, CopyIcon, CheckIcon, StorefrontIcon,
    ReceiptIcon, ChartPieIcon, KeyIcon, ShieldCheckIcon, CaretRightIcon, ArrowLeftIcon,
    EyeIcon, EyeSlashIcon, PlusIcon, XIcon, ListIcon, ArrowsClockwise as ArrowsClockwiseIcon,
    Warning as WarningIcon
} from '@phosphor-icons/react';
import Image from 'next/image';
import Link from 'next/link';
import ParticlesBackground from '@/components/shared/ParticlesBackground';
import { useRouter } from 'next/navigation';

import { useMerchant } from '@/context/MerchantContext';
import { useKaspaData } from '@/hooks/useKaspaData';
import { useToast } from '@/context/ToastContext';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { SERVICES } from '@/data/subscriptions';


const SkeletonLoader = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
);

export default function MerchantDashboard() {
    const { merchant, createNewService, logoutMerchant, isLoading: isAuthLoading } = useMerchant();
    const router = useRouter();
    const { showToast } = useToast();

    // Create Service Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newServiceName, setNewServiceName] = useState('');

    // [NEW] Live Data Integration with API recovery callback
    const {
        balance,
        transactions,
        stats,
        isLoading: isDataLoading,
        isUsingDemoData,
        refetch
    } = useKaspaData(merchant?.walletPublicKey || null);

    // Derived Metrics from Hook
    const totalRevenue = stats?.revenue || 0;
    const txCount = stats?.txCount || 0; // This is count of incoming txs (customers)
    const uniqueCustomers = stats?.uniqueCustomers || 0;
    const mrr = stats?.mrr || 0;

    // Calculate Gas Saved (Simulated based on Volume for "The Flex")
    // Assuming 0.0001 KAS per tx vs standard network
    const gasSaved = txCount * 0.0001;

    // Chart Data - Single segment for now as we don't have product breakdown yet
    const chartData = [
        { name: 'General Revenue', value: totalRevenue || 100, color: '#F97316' }
    ];

    const [showKey, setShowKey] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const [newServicePrice, setNewServicePrice] = useState(19.99);
    const [newServiceColor, setNewServiceColor] = useState('#EF4444');

    // Navigation state
    const [activeSection, setActiveSection] = useState<'dashboard' | 'analytics' | 'customers' | 'invoices' | 'developer'>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Protect Route - redirect to signin if not logged in (only after loading completes)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isAuthLoading && !merchant) {
                router.push('/merchant-auth');
            }
        }, 1000); // Slight delay to prevent flicker
        return () => clearTimeout(timer);
    }, [merchant, isAuthLoading, router]);

    // Handle sidebar default state based on screen size
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setSidebarOpen(true); // Open sidebar on desktop by default
            } else {
                setSidebarOpen(false); // Close on mobile
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleCreateService = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        createNewService(newServiceName, newServicePrice, "Monthly Subscription", newServiceColor);
        setIsCreating(false);
        setIsCreateModalOpen(false);
        setNewServiceName('');
        setNewServicePrice(19.99);
    };

    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-zinc-500 text-sm">Loading Merchant Portal...</p>
                </div>
            </div>
        );
    }

    if (!merchant) return null;

    return (
        <div className="flex min-h-screen bg-black text-white font-sans selection:bg-orange-500/30 pt-5">
            {/* Mobile/Desktop Hamburger Menu Toggle */}
            {!sidebarOpen && (
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="fixed top-4 left-4 z-50 w-12 h-12 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-xl flex items-center justify-center text-white hover:bg-zinc-800 transition-colors shadow-lg"
                    title="Open Menu"
                >
                    <ListIcon size={24} />
                </button>
            )}

            {/* Mobile Backdrop */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
                    />
                )}
            </AnimatePresence>

            {/* SIDEBAR */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.aside
                        initial={{ x: -300 }}
                        animate={{ x: 0 }}
                        exit={{ x: -300 }}
                        transition={{ type: 'spring', damping: 20 }}
                        className="w-64 border-r border-white/10 bg-zinc-900/50 flex flex-col fixed inset-y-0 z-40 backdrop-blur-xl"
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-8">
                                <Link href="/" className="group flex items-center gap-3">
                                    <div className="w-8 h-8 bg-orange-500 text-black flex items-center justify-center rounded-lg font-black text-xl shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                                        C
                                    </div>
                                    <span className="text-xl font-black bg-white text-transparent bg-clip-text">
                                        CadPay
                                    </span>
                                </Link>
                                <button onClick={() => setSidebarOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                                    <XIcon size={24} />
                                </button>
                            </div>

                            <nav className="space-y-1">
                                <NavItem
                                    icon={<StorefrontIcon size={20} />}
                                    label="Dashboard"
                                    active={activeSection === 'dashboard'}
                                    onClick={() => {
                                        setActiveSection('dashboard');
                                        if (window.innerWidth < 768) setSidebarOpen(false);
                                    }}
                                />
                                <NavItem
                                    icon={<ChartPieIcon size={20} />}
                                    label="Analytics"
                                    active={activeSection === 'analytics'}
                                    onClick={() => {
                                        setActiveSection('analytics');
                                        if (window.innerWidth < 768) setSidebarOpen(false);
                                    }}
                                />
                                <NavItem
                                    icon={<UsersIcon size={20} />}
                                    label="Customers"
                                    active={activeSection === 'customers'}
                                    onClick={() => {
                                        setActiveSection('customers');
                                        if (window.innerWidth < 768) setSidebarOpen(false);
                                    }}
                                />
                                <NavItem
                                    icon={<ReceiptIcon size={20} />}
                                    label="Invoices"
                                    active={activeSection === 'invoices'}
                                    onClick={() => {
                                        setActiveSection('invoices');
                                        if (window.innerWidth < 768) setSidebarOpen(false);
                                    }}
                                />
                                <NavItem
                                    icon={<KeyIcon size={20} />}
                                    label="Developer"
                                    active={activeSection === 'developer'}
                                    onClick={() => {
                                        setActiveSection('developer');
                                        if (window.innerWidth < 768) setSidebarOpen(false);
                                    }}
                                />
                            </nav>
                        </div>

                        <div className="mt-auto p-6 border-t border-white/5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-linear-to-tr from-orange-500 to-amber-500 flex items-center justify-center font-bold text-black border-2 border-white/10">
                                    {merchant.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{merchant.name}</p>
                                    <p className="text-xs text-zinc-400 truncate">{merchant.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    logoutMerchant();
                                    router.push('/merchant-auth');
                                }}
                                className="w-full py-2 text-xs text-zinc-500 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                Sign Out
                            </button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* MAIN CONTENT */}
            <main className={`flex-1 transition-all duration-300 p-4 sm:p-6 md:p-8 ${sidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
                {/* Demo Mode Banner */}
                {isUsingDemoData && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-3">
                            <WarningIcon size={24} className="text-orange-500" weight="fill" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-orange-400">Demo Mode Active</p>
                                <p className="text-xs text-zinc-400">Kaspa API is temporarily unavailable. Showing demo data. The system will automatically switch to live data when the API recovers.</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {!merchant ? (
                    <div className="flex items-center justify-center h-screen">
                        <div className="text-zinc-500">Loading...</div>
                    </div>
                ) : (
                    <>
                        <header className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
                                <p className="text-zinc-400">Welcome back, here's what's happening with {merchant.name} today.</p>
                            </div>
                        </header>

                        {/* 1. NORTH STAR METRICS */}
                        {['dashboard', 'analytics'].includes(activeSection) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                                <MetricCard
                                    title="Total Revenue"
                                    value={`${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KAS`}
                                    trend="+0%"
                                    icon={<TrendUpIcon size={24} className="text-green-400" />}
                                    color="green"
                                    loading={isDataLoading}
                                />
                                <MetricCard
                                    title="Total Customers"
                                    value={uniqueCustomers.toLocaleString()}
                                    trend={`+${uniqueCustomers} new`}
                                    icon={<UsersIcon size={24} className="text-blue-400" />}
                                    color="blue"
                                    loading={isDataLoading}
                                />
                                <MetricCard
                                    title="Monthly Recurring (MRR)"
                                    value={`${mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KAS`}
                                    trend="+0%"
                                    icon={<ReceiptIcon size={24} className="text-purple-400" />}
                                    color="purple"
                                    loading={isDataLoading}
                                />
                                <MetricCard
                                    title="Gas Subsidized (The Flex)"
                                    value={`${gasSaved.toFixed(4)} KAS`}
                                    trend="100% Covered"
                                    icon={<LightningIcon size={24} className="text-orange-400 fill-orange-400" />}
                                    color="orange"
                                    subtext="You saved users this much!"
                                    loading={isDataLoading}
                                />
                            </div>
                        )}

                        <div className="grid lg:grid-cols-3 gap-8 mb-8">
                            {/* 2. REVENUE SPLIT CHART */}
                            {['dashboard', 'analytics'].includes(activeSection) && (
                                <div className="lg:col-span-1 bg-zinc-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="font-bold text-white">Revenue Split</h3>
                                        <button className="text-zinc-500 hover:text-white"><ChartPieIcon size={20} /></button>
                                    </div>

                                    <div className="h-80 w-full relative min-w-0">
                                        {isDataLoading && totalRevenue === 0 ? (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                            </div>
                                        ) : (
                                            <>
                                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                                    <PieChart>
                                                        <Pie
                                                            data={totalRevenue > 0 ? chartData : [{ name: 'No Data', value: 100, color: '#27272a' }]}
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                            stroke="none"
                                                        >
                                                            {(totalRevenue > 0 ? chartData : [{ name: 'No Data', value: 100, color: '#27272a' }]).map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            formatter={(value: any) => `${value?.toLocaleString()} KAS`}
                                                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                                                            itemStyle={{ color: '#fff' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                {/* Center Text */}
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <div className="text-center">
                                                        <span className="block text-zinc-500 text-xs">Total</span>
                                                        <span className="block text-xl font-bold text-white">
                                                            {totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </span>
                                                        <span className="block text-[10px] text-zinc-500">KAS</span>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-center text-zinc-500 text-sm">Revenue distribution across your active products.</p>
                                    </div>
                                </div>
                            )}

                            {/* 3. LIVE LEDGER */}
                            {['dashboard', 'customers'].includes(activeSection) && (
                                <div className={activeSection === 'customers' ? "lg:col-span-3 bg-zinc-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-sm flex flex-col" : "lg:col-span-2 bg-zinc-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-sm flex flex-col"}>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <h3 className="text-xl font-bold text-white">Live Ledger</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Live data</span>
                                                </span>
                                                <button
                                                    onClick={refetch}
                                                    disabled={isDataLoading}
                                                    className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                                                    title="Refresh Transactions"
                                                >
                                                    <ArrowsClockwiseIcon className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-zinc-500 font-mono">{merchant.walletPublicKey.slice(0, 4)}...{merchant.walletPublicKey.slice(-4)}</span>
                                            <button
                                                onClick={() => copyToClipboard(merchant.walletPublicKey, 'merchant-wallet')}
                                                className="text-zinc-500 cursor-pointer hover:text-white transition-colors"
                                            >
                                                {copiedId === 'merchant-wallet' ? (
                                                    <CheckIcon size={14} className="text-green-400" />
                                                ) : (
                                                    <CopyIcon size={14} />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto flex-1">
                                        <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                            <thead>
                                                <tr className="text-xs text-zinc-500 uppercase tracking-wider border-b border-white/5">
                                                    <th className="pb-3 pl-2 font-medium">Status</th>
                                                    <th className="pb-3 font-medium hidden lg:table-cell">Type</th>
                                                    <th className="pb-3 font-medium hidden md:table-cell">Party</th>
                                                    <th className="pb-3 font-medium">TX ID</th>
                                                    <th className="pb-3 text-right font-medium pr-2">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm divide-y divide-white/5">
                                                {isDataLoading && transactions.length === 0 ? (
                                                    // Skeleton Loading Rows
                                                    Array.from({ length: 5 }).map((_, i) => (
                                                        <tr key={i}>
                                                            <td className="py-4 pl-2"><SkeletonLoader className="h-4 w-16" /></td>
                                                            <td className="py-4 hidden lg:table-cell"><SkeletonLoader className="h-4 w-24" /></td>
                                                            <td className="py-4 hidden md:table-cell"><SkeletonLoader className="h-4 w-32" /></td>
                                                            <td className="py-4 px-1"><SkeletonLoader className="h-4 w-20" /></td>
                                                            <td className="py-4 text-right pr-2"><SkeletonLoader className="h-4 w-12 ml-auto" /></td>
                                                        </tr>
                                                    ))
                                                ) : transactions.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="py-12 text-center text-zinc-700">
                                                            No active transactions found on-chain.
                                                        </td>
                                                    </tr>
                                                ) : transactions.map((tx: any, i: number) => (
                                                    <motion.tr
                                                        key={tx.id}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        className="group hover:bg-white/5 transition-colors"
                                                    >
                                                        <td className="py-3 pl-2">
                                                            <div className="flex items-center gap-2">
                                                                <CheckIcon size={14} className="text-green-500 font-bold" />
                                                                <span className='text-green-400 hidden sm:inline'>Success</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 hidden lg:table-cell">
                                                            <span className={`font-medium ${tx.isIncoming ? 'text-green-400' : 'text-orange-400'}`}>
                                                                {tx.isIncoming ? 'Payment In' : 'Transfer Out'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 font-mono text-xs text-zinc-400 hidden md:table-cell">
                                                            {tx.sender ? `${tx.sender.slice(0, 6)}...${tx.sender.slice(-6)}` : 'Unknown'}
                                                        </td>
                                                        <td className="py-3 px-1">
                                                            <div className="flex items-center gap-1 relative">
                                                                <span className="font-mono text-[10px] sm:text-xs text-zinc-400 truncate max-w-15 sm:max-w-25">
                                                                    {tx.id.slice(0, 4)}...{tx.id.slice(-4)}
                                                                </span>
                                                                <button
                                                                    onClick={() => copyToClipboard(tx.id, tx.id)}
                                                                    className="text-zinc-500 hover:text-white transition-colors relative shrink-0"
                                                                >
                                                                    {copiedId === tx.id ?
                                                                        <CheckIcon size={12} className="text-green-400" /> :
                                                                        <CopyIcon size={12} />
                                                                    }
                                                                </button>
                                                                {copiedId === tx.id && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 5 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0 }}
                                                                        className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10"
                                                                    >
                                                                        Copied!
                                                                    </motion.div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className={`py-3 pr-2 text-right font-bold text-[10px] sm:text-xs ${tx.isIncoming ? 'text-green-400' : 'text-white'}`}>
                                                            {tx.isIncoming ? '+' : '-'}{tx.amount.toFixed(2)} KAS
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 4. PRODUCT STUDIO & DEV KEYS */}
                        {['dashboard', 'developer'].includes(activeSection) && (
                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Products */}
                                {activeSection === 'dashboard' && (
                                    <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="font-bold text-white">Active Plans</h3>
                                            <button
                                                onClick={() => setIsCreateModalOpen(true)}
                                                className="text-xs font-bold bg-white text-black px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors flex items-center gap-1"
                                            >
                                                <PlusIcon size={14} /> Create Payment Link
                                            </button>
                                        </div>

                                        {/* Empty State or List */}
                                        <div className="space-y-4">
                                            <div className="p-8 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center">
                                                <div className="p-3 bg-zinc-800 rounded-full mb-3 text-zinc-400">
                                                    <StorefrontIcon size={24} />
                                                </div>
                                                <p className="text-sm font-medium text-zinc-300">No active plans</p>
                                                <p className="text-xs text-zinc-500 mb-3">Create your first subscription tier</p>
                                                <button onClick={() => setIsCreateModalOpen(true)} className="text-orange-500 text-xs font-bold hover:underline">Create Now</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Developer Keys */}
                                {activeSection === 'developer' && (
                                    <div className="md:col-span-2 bg-zinc-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden">
                                        <div className="flex items-center gap-3 mb-6 relative z-10">
                                            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                                                <KeyIcon size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">Developer API Keys</h3>
                                                <p className="text-xs text-zinc-400">Manage your integration secrets</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4 relative z-10">
                                            <div>
                                                <label className="block text-xs uppercase font-bold text-zinc-500 tracking-wider mb-2">Publishable Key</label>
                                                <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl p-3">
                                                    <code className="text-sm font-mono text-zinc-300">{merchant.walletPublicKey}</code>
                                                    <CopyIcon size={16} className="text-zinc-500 cursor-pointer hover:text-white" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs uppercase font-bold text-zinc-500 tracking-wider mb-2">Secret Key</label>
                                                <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl p-3">
                                                    <code className="text-sm font-mono text-zinc-300">
                                                        {showKey ? merchant.walletSecretKey : 'sk_live_•••••••••••••••••••••'}
                                                    </code>
                                                    <button onClick={() => setShowKey(!showKey)} className="text-zinc-500 cursor-pointer hover:text-white">
                                                        {showKey ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-orange-500/80 mt-2 flex items-center gap-1.5">
                                                    <ShieldCheckIcon size={14} /> Never share your secret key client-side.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Background Effect */}
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                                    </div>
                                )}
                            </div>
                        )}

                        {activeSection === 'invoices' && (
                            <div className="flex flex-col items-center justify-center p-12 lg:p-24 border-2 border-dashed border-zinc-800 rounded-3xl text-center bg-zinc-900/20">
                                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6 text-zinc-500">
                                    <ReceiptIcon size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Invoices Coming Soon</h2>
                                <p className="text-zinc-400 max-w-md">Streamline your billing with professional, on-chain invoices. This feature is currently under development.</p>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Create Service Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setIsCreateModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white">New Subscription Plan</h3>
                                <button onClick={() => setIsCreateModalOpen(false)}><XIcon size={20} className="text-zinc-400 hover:text-white" /></button>
                            </div>

                            <form onSubmit={handleCreateService} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Service Name</label>
                                    <input
                                        type="text" value={newServiceName} onChange={e => setNewServiceName(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                                        placeholder="e.g. Premium Plan"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Price (USDC)</label>
                                    <input
                                        type="number" step="0.01" value={newServicePrice} onChange={e => setNewServicePrice(parseFloat(e.target.value))}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Brand Color</label>
                                    <div className="flex gap-2">
                                        {['#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'].map(color => (
                                            <div
                                                key={color}
                                                onClick={() => setNewServiceColor(color)}
                                                className={`w-8 h-8 rounded-full cursor-pointer border-2 ${newServiceColor === color ? 'border-white' : 'border-transparent'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCreating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Plan'
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}


function NavItem({ icon, label, active, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${active
                ? 'bg-white text-black font-bold shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
        >
            {icon}
            <span className="text-sm">{label}</span>
        </div>
    );
}

// 5. Updated Metric Card with Skeleton Support
function MetricCard({ title, value, trend, icon, color, subtext, loading }: any) {
    const colors: Record<string, string> = {
        green: 'bg-green-500/10 text-green-400 border-green-500/20',
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    };

    return (
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 p-6 rounded-3xl relative overflow-hidden group hover:bg-white/5 transition-colors">
            {/* Background Glow */}
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity ${colors[color].split(' ')[1].replace('text-', 'bg-')}`} />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-2xl border ${colors[color]}`}>
                    {icon}
                </div>
                {loading ? (
                    <SkeletonLoader className="h-5 w-12" />
                ) : (
                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend.includes('+') ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>
                        {trend}
                    </div>
                )}
            </div>

            <div className="space-y-1 relative z-10">
                <p className="text-sm text-zinc-500 font-medium">{title}</p>
                {loading ? (
                    <SkeletonLoader className="h-8 w-3/4 mb-1" />
                ) : (
                    <h3 className="text-2xl font-bold text-white">{value}</h3>
                )}
                {subtext && !loading && <p className="text-xs text-zinc-500 mt-1">{subtext}</p>}
            </div>
        </div>
    );
}
