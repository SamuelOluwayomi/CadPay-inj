'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    DeviceMobileIcon, DesktopIcon, TrashIcon, ShieldCheckIcon,
    PlusIcon, KeyIcon, DownloadIcon, FingerprintIcon, LockKeyIcon,
    ClockCounterClockwiseIcon, ShieldWarningIcon, CaretRightIcon
} from '@phosphor-icons/react';
import { useUser } from '@/context/UserContext';

// Detect current browser and device
const getCurrentDevice = () => {
    const ua = navigator.userAgent;
    let browser = 'Unknown Browser';
    let deviceType: 'desktop' | 'mobile' = 'desktop';

    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';

    let os = 'Unknown OS';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) { os = 'Android'; deviceType = 'mobile'; }
    else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; deviceType = 'mobile'; }

    return {
        name: `${browser} on ${os}`,
        type: deviceType,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        current: true,
        id: Date.now()
    };
};

const DUMMY_ACTIVITIES = [
    { id: 1, action: 'Signed in successfully', device: 'Current Session', location: 'Local Network', time: 'Just now', type: 'login' },
    { id: 2, action: 'Profile Details Updated', device: 'Current Session', location: 'Local Network', time: '1 hour ago', type: 'security' },
    { id: 3, action: 'Subscription Modified', device: 'System Server', location: 'Injective Network', time: 'Yesterday', type: 'tx' },
];

export default function SecuritySettings() {
    const { profile } = useUser();
    const [devices, setDevices] = useState<any[]>([]);

    useEffect(() => {
        const storedDevices = localStorage.getItem('registeredDevices');
        if (storedDevices) {
            const parsedDevices = JSON.parse(storedDevices);
            const currentDevice = getCurrentDevice();
            const exists = parsedDevices.some((d: any) => d.name === currentDevice.name);

            if (!exists) {
                const updated = [...parsedDevices.map((d: any) => ({ ...d, current: false })), currentDevice];
                setDevices(updated);
                localStorage.setItem('registeredDevices', JSON.stringify(updated));
            } else {
                setDevices(parsedDevices.map((d: any) => ({
                    ...d,
                    current: d.name === currentDevice.name
                })));
            }
        } else {
            const currentDevice = getCurrentDevice();
            setDevices([currentDevice]);
            localStorage.setItem('registeredDevices', JSON.stringify([currentDevice]));
        }
    }, []);

    const handleRemoveDevice = (deviceId: number) => {
        const updated = devices.filter(d => d.id !== deviceId);
        setDevices(updated);
        localStorage.setItem('registeredDevices', JSON.stringify(updated));
    };

    const handleExportWallet = () => {
        const walletData = {
            timestamp: new Date().toISOString(),
            note: 'CadPay Wallet Backup - Store securely!',
            warning: 'Never share this with anyone'
        };

        const dataStr = JSON.stringify(walletData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `cadpay-backup-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const isBiometric = profile?.auth_method === 'biometric';
    const isCustodial = !!profile?.encrypted_private_key;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 max-w-5xl"
        >
            <div className="flex items-end justify-between mb-8">
                <div>
                    <h2 className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-white to-zinc-500 tracking-tight mb-2">Security Hub</h2>
                    <p className="text-sm text-zinc-400">Manage your authentication, devices, and wallet security.</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-bold text-green-400 uppercase tracking-widest">System Secure</span>
                </div>
            </div>

            {/* Authentication Method */}
            <div className="relative overflow-hidden bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-1 group">
                {/* Glow Effect */}
                <div className={`absolute -inset-20 opacity-0 group-hover:opacity-20 transition-opacity duration-1000 blur-3xl rounded-[100%] pointer-events-none ${isBiometric ? 'bg-green-500' : 'bg-orange-500'}`} />

                <div className="relative bg-black/40 backdrop-blur-md rounded-[22px] p-6 lg:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between border border-white/5">
                    <div className="flex gap-5 items-start md:items-center">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${isBiometric ? 'bg-linear-to-br from-green-500/20 to-green-600/10 text-green-400 border border-green-500/30' : 'bg-linear-to-br from-orange-500/20 to-orange-600/10 text-orange-400 border border-orange-500/30'}`}>
                            {isBiometric ? <FingerprintIcon size={28} weight="duotone" /> : <LockKeyIcon size={28} weight="duotone" />}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">
                                {isBiometric ? 'Biometric Passkey' : 'Security PIN'} Enabled
                            </h3>
                            <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
                                {isBiometric
                                    ? 'Your wallet is secured by your device\'s hardware enclave. Cryptographic signatures are generated instantly via Touch ID or Face ID.'
                                    : 'Your transactions are verified using your 4-digit Security PIN. Switch to Biometrics for seamless, hardware-level security.'}
                            </p>
                        </div>
                    </div>
                    {!isBiometric && (
                        <button className="whitespace-nowrap px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 group/btn w-full md:w-auto mt-4 md:mt-0">
                            Enable Passkey
                            <CaretRightIcon size={16} className="text-zinc-500 group-hover/btn:text-white transition-colors" weight="bold" />
                        </button>
                    )}
                </div>
            </div>

            {/* Two Column Layout for Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left Column */}
                <div className="space-y-6">
                    {/* Active Devices */}
                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-8 h-full">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
                                    <DesktopIcon size={20} weight="duotone" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Active Sessions</h3>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {devices.map((device) => (
                                <div key={device.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center border border-white/5">
                                            {device.type === 'mobile' ? (
                                                <DeviceMobileIcon size={18} className="text-zinc-400" />
                                            ) : (
                                                <DesktopIcon size={18} className="text-zinc-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="text-sm font-bold text-white">{device.name}</p>
                                                {device.current && (
                                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-widest rounded-full border border-green-500/20">
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-zinc-500 font-medium">Added {device.date}</p>
                                        </div>
                                    </div>
                                    {!device.current && (
                                        <button onClick={() => handleRemoveDevice(device.id)} className="p-2 hover:bg-red-500/10 rounded-xl transition-colors group">
                                            <TrashIcon size={18} className="text-zinc-500 group-hover:text-red-400" weight="bold" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Threat Protection / Auto-Lock */}
                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
                                <ShieldWarningIcon size={20} weight="duotone" />
                            </div>
                            <h3 className="text-lg font-bold text-white">System Shield</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <p className="text-sm font-bold text-white mb-1">Require PIN on Startup</p>
                                    <p className="text-xs text-zinc-500">Ask for auth when opening app</p>
                                </div>
                                <div className="w-11 h-6 bg-orange-500 rounded-full p-1 cursor-pointer flex justify-end transition-colors shadow-inner">
                                    <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <p className="text-sm font-bold text-white mb-1">Auto-Lock Timer</p>
                                    <p className="text-xs text-zinc-500">Lock wallet after inactivity</p>
                                </div>
                                <select className="bg-black/50 border border-white/10 text-white text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500 cursor-pointer">
                                    <option>5 minutes</option>
                                    <option>15 minutes</option>
                                    <option>1 hour</option>
                                    <option>Never</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6 flex flex-col">
                    {/* Wallet Backup */}
                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-8 relative overflow-hidden group">
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-orange-500/5 to-transparent pointer-events-none" />

                        <div className="flex items-center gap-3 mb-4 relative z-10">
                            <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400">
                                <DownloadIcon size={20} weight="duotone" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Wallet Recovery</h3>
                        </div>

                        {isCustodial ? (
                            <>
                                <p className="text-sm text-zinc-400 mb-6 relative z-10 leading-relaxed">
                                    Export your encrypted wallet data. Ensure you store this in a highly secure offline location. Never share it with anyone.
                                </p>
                                <button onClick={handleExportWallet} className="w-full py-4 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.98] relative z-10">
                                    <DownloadIcon size={18} weight="bold" />
                                    Export Encrypted Backup
                                </button>
                            </>
                        ) : (
                            <div className="p-5 bg-green-500/5 border border-green-500/20 rounded-2xl relative z-10 hover:bg-green-500/10 transition-colors">
                                <div className="flex gap-4">
                                    <ShieldCheckIcon size={24} className="text-green-500 shrink-0 mt-0.5" weight="duotone" />
                                    <div>
                                        <p className="text-sm font-bold text-green-400 mb-2">Backup Not Required</p>
                                        <p className="text-xs text-green-200/60 leading-relaxed">
                                            Your wallet is a completely non-custodial smart contract secured natively by your device's passkey. There is no seed phrase or raw private key to expose or lose.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Activity Log */}
                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-8 flex-1">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-white/5 border border-white/10 rounded-lg text-zinc-300">
                                <ClockCounterClockwiseIcon size={20} weight="duotone" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Recent Security Logs</h3>
                        </div>

                        <div className="relative pl-4 space-y-6 before:absolute before:inset-y-2 before:left-[11px] before:w-px before:bg-linear-to-b before:from-white/10 before:via-white/10 before:to-transparent">
                            {DUMMY_ACTIVITIES.map((activity) => (
                                <div key={activity.id} className="relative pl-6">
                                    <div className={`absolute left-[-15px] top-1.5 w-2 h-2 rounded-full ring-4 ring-[#121214] ${activity.type === 'login' ? 'bg-green-500' : activity.type === 'security' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                                    <p className="text-sm font-bold text-white mb-1">{activity.action}</p>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 font-medium">
                                        <span>{activity.device}</span>
                                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                        <span>{activity.location}</span>
                                    </div>
                                    <p className="text-[10px] text-zinc-600 mt-2 font-bold uppercase tracking-widest">{activity.time}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-red-500/20 rounded-3xl p-6 lg:p-8 shadow-[inset_0_0_40px_rgba(239,68,68,0.02)]">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                                <TrashIcon size={20} weight="duotone" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Danger Zone</h3>
                        </div>
                        <p className="text-sm text-zinc-400 mb-6">Permanently remove all data and disconnect wallet.</p>

                        <button
                            onClick={() => {
                                if (window.confirm('Are you ABSOLUTELY sure? This will delete ALL your data and cannot be undone!')) {
                                    localStorage.clear();
                                    window.location.href = '/';
                                }
                            }}
                            className="w-full py-4 bg-transparent hover:bg-red-500/10 border border-red-500/30 hover:border-red-500/50 text-red-400 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <TrashIcon size={18} weight="bold" />
                            Delete Account Space
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
