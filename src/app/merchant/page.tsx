'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    WalletIcon, TrendUpIcon, UsersIcon, LightningIcon, CopyIcon, CheckIcon, StorefrontIcon,
    ReceiptIcon, ChartPieIcon, KeyIcon, ShieldCheckIcon, CaretRightIcon, ArrowLeftIcon,
    EyeIcon, EyeSlashIcon, PlusIcon, XIcon, ListIcon, ArrowsClockwise as ArrowsClockwiseIcon,
    Warning as WarningIcon, UserCircle as UserCircleIcon, CurrencyDollar as CurrencyDollarIcon, 
    ChartLineUp as ChartLineUpIcon, ArrowRight as ArrowRightIcon, Image as ImageIcon, UploadSimple as UploadIcon
} from '@phosphor-icons/react';
import Image from 'next/image';
import Link from 'next/link';
import ParticlesBackground from '@/components/shared/ParticlesBackground';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

import { useMerchant } from '@/context/MerchantContext';
import { useInjectiveData } from '@/hooks/useInjectiveData';
import { useToast } from '@/context/ToastContext';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { SERVICES } from '@/data/subscriptions';


const SkeletonLoader = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
);

export default function MerchantDashboard() {
    const { merchant, createNewService, logoutMerchant, services, subscriptions, isLoading: isAuthLoading } = useMerchant();
    const router = useRouter();
    const { showToast } = useToast();

    // Create Service Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    
    // Form State
    const [newServiceName, setNewServiceName] = useState('');
    const [newServiceCategory, setNewServiceCategory] = useState('streaming');
    const [newServiceDescription, setNewServiceDescription] = useState('');
    const [newServiceColor, setNewServiceColor] = useState('#F97316');
    const [newServicePrices, setNewServicePrices] = useState({ basic: 9.99, pro: 19.99, enterprise: 49.99 });
    const [newServiceFeatures, setNewServiceFeatures] = useState({ 
        basic: ['Access all content'], 
        pro: ['Priority support', 'HD Streaming'], 
        enterprise: ['Unlimited devices', 'Enterprise API'] 
    });

    // Subscriptions integration
    const {
        balance,
        transactions,
        stats,
        isLoading: isDataLoading,
        isUsingDemoData,
        refetch
    } = useInjectiveData(merchant?.walletPublicKey || null);

    // Derived Metrics from Hook
    const activeSubscribers = subscriptions.filter(s => s.status === 'active').length;
    const monthlyRevenue = subscriptions
        .filter(s => s.status === 'active')
        .reduce((acc, sub) => acc + sub.priceUsd, 0);
    const totalTransactions = transactions?.length || 0;
    const avgTicket = activeSubscribers > 0 ? (monthlyRevenue / activeSubscribers) : 0;

    // Calculate Churn Rate
    const totalSubs = subscriptions.length;
    const inactiveSubs = subscriptions.filter(s => s.status === 'canceled' || s.status === 'expired').length;
    const churnRate = totalSubs > 0 ? (inactiveSubs / totalSubs) * 100 : 0;

    // Calculate Gas Saved (Simulated based on Volume for "The Flex")
    // Assuming 0.0001 INJ per tx vs standard network
    const gasSaved = totalTransactions * 0.0001;

    // Chart Data - Single segment for now as we don't have product breakdown yet
    const chartData = [
        { name: 'General Revenue', value: monthlyRevenue || 100, color: '#F97316' }
    ];

    const [showKey, setShowKey] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const [newServicePrice, setNewServicePrice] = useState(19.99);

    // Navigation state
    const [activeSection, setActiveSection] = useState<'dashboard' | 'analytics' | 'customers' | 'invoices' | 'developer'>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [isLoadingKey, setIsLoadingKey] = useState(false);

    // Image Upload State
    const [serviceImageFile, setServiceImageFile] = useState<File | null>(null);
    const [serviceImageUrl, setServiceImageUrl] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setServiceImageFile(e.target.files[0]);
            // Create a preview URL
            setServiceImageUrl(URL.createObjectURL(e.target.files[0]));
        }
    };

    const uploadImageToSupabase = async (file: File) => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${merchant?.id}/${fileName}`;

            const { data, error } = await supabase.storage
                .from('service-images')
                .upload(filePath, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('service-images')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    };

    const fetchApiKey = useCallback(async () => {
        if (!merchant?.id) return;
        setIsLoadingKey(true);
        try {
            const res = await fetch(`/api/merchant/keys?merchantId=${merchant.id}`);
            const data = await res.json();
            setApiKey(data.apiKey);
        } catch (e) {
            console.error("Failed to fetch API key", e);
        } finally {
            setIsLoadingKey(false);
        }
    }, [merchant?.id]);

    const rotateApiKey = async () => {
        if (!merchant?.id) return;
        if (!confirm("Are you sure? This will break existing integrations using the old key.")) return;
        
        setIsLoadingKey(true);
        try {
            const res = await fetch('/api/merchant/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ merchantId: merchant.id })
            });
            const data = await res.json();
            setApiKey(data.apiKey);
            showToast("API Key rotated successfully", "success");
        } catch (e) {
            showToast("Failed to rotate API Key", "error");
        } finally {
            setIsLoadingKey(false);
        }
    };

    useEffect(() => {
        if (activeSection === 'developer') {
            fetchApiKey();
        }
    }, [activeSection, fetchApiKey]);

    const downloadSubscribersCSV = () => {
        if (subscriptions.length === 0) {
            showToast("No subscribers to export", "info");
            return;
        }

        const headers = ["ID", "Service", "Plan", "Price USD", "Status", "Start Date", "Next Billing", "User Address"];
        const rows = subscriptions.map(sub => [
            sub.id,
            sub.serviceName,
            sub.planName,
            sub.priceUsd,
            sub.status,
            new Date(sub.createdAt).toLocaleDateString(),
            new Date(sub.nextBillingDate).toLocaleDateString(),
            (sub as any).email || 'N/A'
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `subscribers_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Export successful", "success");
    };

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
        
        try {
            let finalImageUrl = serviceImageUrl;
            if (serviceImageFile) {
                finalImageUrl = await uploadImageToSupabase(serviceImageFile);
            }

            const success = await createNewService({
                name: newServiceName,
                category: newServiceCategory,
                description: newServiceDescription,
                color: newServiceColor,
                priceBasic: newServicePrices.basic,
                pricePro: newServicePrices.pro,
                priceEnterprise: newServicePrices.enterprise,
                featuresBasic: newServiceFeatures.basic,
                featuresPro: newServiceFeatures.pro,
                featuresEnterprise: newServiceFeatures.enterprise,
                imageUrl: finalImageUrl || ''
            });

            if (success) {
                showToast("Service created successfully!", "success");
                setIsCreateModalOpen(false);
                // Reset form
                setNewServiceName('');
                setNewServiceDescription('');
                setServiceImageFile(null);
                setServiceImageUrl(null);
            } else {
                showToast("Failed to create service", "error");
            }
        } catch (err) {
            console.error("Creation failed", err);
            showToast("An error occurred", "error");
        } finally {
            setIsCreating(false);
        }
    };
    
    const addFeature = (tier: 'basic' | 'pro' | 'enterprise') => {
        const feature = prompt("Enter feature description:");
        if (feature) {
            setNewServiceFeatures(prev => ({
                ...prev,
                [tier]: [...prev[tier], feature]
            }));
        }
    };

    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-zinc-500 text-sm">Loading Merchant Portal...</p>
                </div>
            </div>
        );
    }

    if (!merchant) return <div className="min-h-screen bg-black" />; // Keep it dark during redirect

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
                                    <div className="w-8 h-8 bg-orange-600 text-white flex items-center justify-center rounded-lg font-black text-xl shadow-lg shadow-orange-600/20 group-hover:scale-110 transition-transform">
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
                                <div className="w-10 h-10 rounded-full bg-linear-to-tr from-orange-500 to-orange-600 flex items-center justify-center font-bold text-white border-2 border-white/10">
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
                                <p className="text-xs text-zinc-400">Injective API is temporarily unavailable. Showing demo data. The system will automatically switch to live data when the API recovers.</p>
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
                                <h1 className="text-3xl font-bold text-white">
                                    {activeSection === 'developer' ? 'Developer Platform' : 'Dashboard Overview'}
                                </h1>
                                <p className="text-zinc-400">
                                    {activeSection === 'developer' 
                                        ? 'Build and integrate custom subscription logic with CadPay APIs.' 
                                        : `Welcome back, here's what's happening with ${merchant.name} today.`}
                                </p>
                            </div>
                        </header>

                        {/* 1. NORTH STAR METRICS */}
                        {['dashboard', 'analytics'].includes(activeSection) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                                <MetricCard
                                    title="Total Revenue"
                                    value={`${monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                                    trend="+0%"
                                    icon={<TrendUpIcon size={24} className="text-green-400" />}
                                    color="green"
                                    loading={isDataLoading}
                                />
                                <MetricCard
                                    title="Total Customers"
                                    value={activeSubscribers.toLocaleString()}
                                    trend={`+${activeSubscribers} new`}
                                    icon={<UsersIcon size={24} className="text-orange-400" />}
                                    color="orange"
                                    loading={isDataLoading}
                                />
                                <MetricCard
                                    title="Monthly Recurring (MRR)"
                                    value={`${monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                                    trend="+0%"
                                    icon={<ReceiptIcon size={24} className="text-purple-400" />}
                                    color="purple"
                                    loading={isDataLoading}
                                />
                                <MetricCard
                                    title="Gas Subsidized (The Flex)"
                                    value={`${gasSaved.toFixed(4)} INJ`}
                                    trend="100% Covered"
                                    icon={<LightningIcon size={24} className="text-orange-400 fill-orange-400" />}
                                    color="orange"
                                    subtext="You saved users this much!"
                                    loading={isDataLoading}
                                />
                                {activeSection === 'analytics' && (
                                    <MetricCard
                                        title="User Churn Rate"
                                        value={`${churnRate.toFixed(1)}%`}
                                        trend={churnRate > 10 ? "At Risk" : "Healthy"}
                                        icon={<WarningIcon size={24} className={churnRate > 10 ? "text-red-400" : "text-green-400"} />}
                                        color={churnRate > 10 ? "red" : "green"}
                                        subtext="Inactive vs Total Subscribers"
                                        loading={isDataLoading}
                                    />
                                )}
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
                                        {isDataLoading && monthlyRevenue === 0 ? (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                            </div>
                                        ) : (
                                            <>
                                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                                    <PieChart>
                                                        <Pie
                                                            data={monthlyRevenue > 0 ? chartData : [{ name: 'No Data', value: 100, color: '#27272a' }]}
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                            stroke="none"
                                                        >
                                                            {(monthlyRevenue > 0 ? chartData : [{ name: 'No Data', value: 100, color: '#27272a' }]).map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            formatter={(value: any) => `${value?.toLocaleString()} USD`}
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
                                                            {monthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </span>
                                                        <span className="block text-[10px] text-zinc-500">USD</span>
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
                                                            {tx.isIncoming ? '+' : '-'}{tx.amount.toFixed(2)} INJ
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

                                        {/* Stats Grid */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                        <StatCard 
                                            label="Active Subscribers" 
                                            value={activeSubscribers.toString()} 
                                            change="+12%" 
                                            icon={<UserCircleIcon size={20} />} 
                                        />
                                        <StatCard 
                                            label="Monthly Revenue" 
                                            value={`$${monthlyRevenue.toLocaleString()}`} 
                                            change="+8.4%" 
                                            icon={<CurrencyDollarIcon size={20} />} 
                                        />
                                        <StatCard 
                                            label="All-time TXs" 
                                            value={totalTransactions.toString()} 
                                            change="+24%" 
                                            icon={<ArrowsClockwiseIcon size={20} />} 
                                        />
                                        <StatCard 
                                            label="Avg. Ticket" 
                                            value={`$${avgTicket.toFixed(2)}`} 
                                            change="-2%" 
                                            icon={<ChartLineUpIcon size={20} />} 
                                        />
                                    </div>
                                        {/* Dynamic Service List */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {services.map((service: any) => (
                                                <div key={service.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-orange-500/30 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: service.color }}>
                                                            <StorefrontIcon size={24} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-white text-sm">{service.name}</h4>
                                                            <p className="text-xs text-zinc-500 uppercase font-black">{service.category}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-orange-500">${service.priceBasic} - ${service.priceEnterprise}</p>
                                                        <p className="text-[10px] text-zinc-500">Tiered Pricing</p>
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {services.length === 0 && (
                                                <div className="md:col-span-2 p-8 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center">
                                                    <div className="p-3 bg-zinc-800 rounded-full mb-3 text-zinc-400">
                                                        <StorefrontIcon size={24} />
                                                    </div>
                                                    <p className="text-sm font-medium text-zinc-300">No active plans</p>
                                                    <p className="text-xs text-zinc-500 mb-3">Create your first subscription tier</p>
                                                    <button onClick={() => setIsCreateModalOpen(true)} className="text-orange-500 text-xs font-bold hover:underline">Create Now</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Developer Keys */}
                                {activeSection === 'developer' && (
                                    <div className="md:col-span-2 space-y-8">
                                        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden">
                                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                                                    <KeyIcon size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white text-xl">API Keys</h3>
                                                    <p className="text-sm text-zinc-500">Authenticate external requests to the CadPay API.</p>
                                                </div>
                                            </div>

                                            <div className="space-y-6 relative z-10">
                                                <div className="p-5 bg-black/40 border border-white/5 rounded-2xl">
                                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Secret key (Production)</label>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-1 font-mono text-sm bg-black/50 p-4 rounded-xl border border-white/5 text-zinc-300">
                                                            {isLoadingKey ? '••••••••••••••••••••••••' : (apiKey || 'No key generated')}
                                                        </div>
                                                        <button 
                                                            onClick={() => copyToClipboard(apiKey || '', 'api-key')}
                                                            className="p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"
                                                        >
                                                            {copiedId === 'api-key' ? <CheckIcon className="text-green-500" /> : <CopyIcon size={20} />}
                                                        </button>
                                                        <button 
                                                            onClick={rotateApiKey}
                                                            disabled={isLoadingKey}
                                                            className="px-6 py-4 bg-white text-black text-xs font-black rounded-xl hover:bg-zinc-200 transition-all uppercase tracking-widest shadow-xl shadow-white/5 disabled:opacity-50"
                                                        >
                                                            {isLoadingKey ? 'Rotating...' : 'Rotate Key'}
                                                        </button>
                                                    </div>
                                                    <p className="mt-3 text-[10px] text-zinc-500 italic">Be careful. Rotating your key will immediately invalidate the current one.</p>
                                                </div>

                                                <div className="p-6 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
                                                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                                        <ShieldCheckIcon size={18} className="text-orange-500" />
                                                        Integration Guide
                                                    </h4>
                                                    <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                                                        To verify if a wallet address has an active subscription to your service, call our verification endpoint from your backend:
                                                    </p>
                                                    <div className="bg-black/80 p-5 rounded-xl border border-white/5 font-mono text-[11px] text-orange-400 overflow-x-auto shadow-inner">
                                                        <p className="text-zinc-500 mb-2">// Server-side check</p>
                                                        GET https://cadpay.xyz/api/v1/verify?apiKey=<span className="text-white">YOUR_KEY</span>&address=<span className="text-white">USER_WALLET</span>&serviceId=<span className="text-white">SERVICE_ID</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                                                <h3 className="font-bold text-white mb-2">Webhooks</h3>
                                                <p className="text-xs text-zinc-500 mb-6 font-medium">Receive real-time notifications for payment events via HTTP POST.</p>
                                                <div className="px-4 py-8 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center">
                                                    <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mb-1 italic">Status: Alpha</p>
                                                    <p className="text-xs text-zinc-700 font-bold">Registration opening soon</p>
                                                </div>
                                            </div>
                                            <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                                                <h3 className="font-bold text-white mb-2">Restricted Domains</h3>
                                                <p className="text-xs text-zinc-500 mb-6 font-medium">Whitelist authorized sources for client-side queries.</p>
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                                                        <span className="text-xs font-mono text-zinc-400">{typeof window !== 'undefined' ? window.location.origin : 'localhost:3000'}</span>
                                                        <span className="text-[8px] font-black uppercase bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded">Default</span>
                                                    </div>
                                                    <button disabled className="w-full mt-2 py-3 bg-white/5 text-zinc-600 rounded-xl font-bold text-xs cursor-not-allowed uppercase tracking-widest border border-white/5">Update Whitelist</button>
                                                </div>
                                            </div>
                                        </div>
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
                            className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl p-6 relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6 sticky top-0 bg-zinc-900 pb-2 z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Create New Web3 Service</h3>
                                    <p className="text-xs text-zinc-500">Your products will be discoverable on the user subscription dashboard.</p>
                                </div>
                                <button onClick={() => setIsCreateModalOpen(false)}><XIcon size={20} className="text-zinc-400 hover:text-white" /></button>
                            </div>

                            <form onSubmit={handleCreateService} className="space-y-8">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Service Identity</label>
                                            <div className="flex gap-4 items-start mb-4">
                                                <div 
                                                    className="w-20 h-20 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-center relative overflow-hidden group/img cursor-pointer transition-all hover:border-orange-500/50"
                                                    onClick={() => document.getElementById('service-image-upload')?.click()}
                                                >
                                                    {serviceImageUrl ? (
                                                        <img src={serviceImageUrl} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon size={24} className="text-zinc-600 group-hover/img:text-orange-500 transition-colors" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                        <UploadIcon size={16} className="text-white" />
                                                    </div>
                                                </div>
                                                <input 
                                                    id="service-image-upload" type="file" accept="image/*" 
                                                    className="hidden" onChange={handleImageChange} 
                                                />
                                                <div className="flex-1">
                                                    <input
                                                        type="text" value={newServiceName} onChange={e => setNewServiceName(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                                                        placeholder="e.g. Injective VPN"
                                                        required
                                                    />
                                                    <p className="text-[10px] text-zinc-500 mt-2 italic px-1">Upload a 1:1 brand logo for best results.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Category</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['streaming', 'music', 'social', 'creative', 'developer', 'ai'].map(cat => (
                                                    <button
                                                        key={cat} type="button"
                                                        onClick={() => setNewServiceCategory(cat)}
                                                        className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${newServiceCategory === cat ? 'bg-orange-600 border-orange-500 text-white' : 'bg-black/40 border-white/5 text-zinc-500 hover:text-zinc-300'}`}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Description</label>
                                            <textarea
                                                value={newServiceDescription} onChange={e => setNewServiceDescription(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 h-24 resize-none text-sm"
                                                placeholder="Tell users what you're building..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Brand Accent</label>
                                            <div className="flex gap-3">
                                                {['#F97316', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6'].map(color => (
                                                    <div
                                                        key={color}
                                                        onClick={() => setNewServiceColor(color)}
                                                        className={`w-8 h-8 rounded-full cursor-pointer border-2 transition-transform hover:scale-110 ${newServiceColor === color ? 'border-white scale-110 ring-2 ring-orange-500/20' : 'border-transparent'}`}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* PRICING TIERS */}
                                    <div className="space-y-6">
                                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Pricing Strategy (USD)</label>
                                        
                                        {/* Basic Tier */}
                                        <div className="p-4 bg-black/40 border border-white/5 rounded-2xl relative">
                                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-zinc-800 rounded text-[8px] font-black uppercase text-zinc-500">Tier 1</div>
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-bold text-white uppercase tracking-tight">Basic</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-zinc-500">$</span>
                                                    <input 
                                                        type="number" value={newServicePrices.basic} 
                                                        onChange={e => setNewServicePrices({...newServicePrices, basic: parseFloat(e.target.value)})}
                                                        className="w-16 bg-transparent border-b border-zinc-800 text-sm font-bold text-white focus:outline-none focus:border-orange-500" 
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                {newServiceFeatures.basic.map((f, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-400">
                                                        <CheckIcon size={12} className="text-orange-500" /> {f}
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => addFeature('basic')} className="text-[10px] text-orange-500/80 hover:text-orange-500">+ Add Feature</button>
                                            </div>
                                        </div>

                                        {/* Pro Tier */}
                                        <div className="p-4 bg-orange-600/5 border border-orange-500/20 rounded-2xl relative">
                                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-orange-600/20 rounded text-[8px] font-black uppercase text-orange-400">Tier 2</div>
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-bold text-white uppercase tracking-tight">Professional</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-zinc-500">$</span>
                                                    <input 
                                                        type="number" value={newServicePrices.pro} 
                                                        onChange={e => setNewServicePrices({...newServicePrices, pro: parseFloat(e.target.value)})}
                                                        className="w-16 bg-transparent border-b border-orange-500/30 text-sm font-bold text-white focus:outline-none focus:border-orange-500" 
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                {newServiceFeatures.pro.map((f, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-400">
                                                        <CheckIcon size={12} className="text-orange-500" /> {f}
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => addFeature('pro')} className="text-[10px] text-orange-500/80 hover:text-orange-500">+ Add Feature</button>
                                            </div>
                                        </div>

                                        {/* Enterprise Tier */}
                                        <div className="p-4 bg-purple-600/5 border border-purple-500/20 rounded-2xl relative">
                                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-purple-600/20 rounded text-[8px] font-black uppercase text-purple-400">Tier 3</div>
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-bold text-white uppercase tracking-tight">Enterprise</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-zinc-500">$</span>
                                                    <input 
                                                        type="number" value={newServicePrices.enterprise} 
                                                        onChange={e => setNewServicePrices({...newServicePrices, enterprise: parseFloat(e.target.value)})}
                                                        className="w-16 bg-transparent border-b border-purple-500/30 text-sm font-bold text-white focus:outline-none focus:border-orange-500" 
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                {newServiceFeatures.enterprise.map((f, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-400">
                                                        <CheckIcon size={12} className="text-orange-500" /> {f}
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => addFeature('enterprise')} className="text-[10px] text-orange-500/80 hover:text-orange-500">+ Add Feature</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-zinc-200 transition-all mt-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-white/5 active:scale-[0.98]"
                                >
                                    {isCreating ? (
                                        <>
                                            <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin" />
                                            Launching on Injective...
                                        </>
                                    ) : (
                                        <>
                                            Deploy Web3 Service
                                            <ArrowRightIcon size={20} weight="bold" />
                                        </>
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

function StatCard({ label, value, change, icon }: any) {
    return (
        <div className="bg-black/20 border border-white/5 p-4 rounded-2xl hover:bg-black/30 transition-all group">
            <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-orange-500 transition-colors">
                    {icon}
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${change.includes('+') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {change}
                </span>
            </div>
            <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{label}</p>
                <p className="text-lg font-black text-white">{value}</p>
            </div>
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
        blue: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
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
