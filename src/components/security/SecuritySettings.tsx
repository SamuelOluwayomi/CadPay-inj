'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DeviceMobileIcon, DesktopIcon, TrashIcon, ShieldCheckIcon, PlusIcon, KeyIcon, DownloadIcon } from '@phosphor-icons/react';

// Detect current browser and device
const getCurrentDevice = () => {
    const ua = navigator.userAgent;
    let browser = 'Unknown Browser';
    let deviceType: 'desktop' | 'mobile' = 'desktop';

    // Detect browser
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';

    // Detect OS
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


export default function SecuritySettings() {
    const [devices, setDevices] = useState<any[]>([]);

    useEffect(() => {
        // Load stored devices from localStorage
        const storedDevices = localStorage.getItem('registeredDevices');
        if (storedDevices) {
            const parsedDevices = JSON.parse(storedDevices);
            // Check if current device exists
            const currentDevice = getCurrentDevice();
            const exists = parsedDevices.some((d: any) => d.name === currentDevice.name);

            if (!exists) {
                // Add current device
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
            // First time - register current device
            const currentDevice = getCurrentDevice();
            setDevices([currentDevice]);
            localStorage.setItem('registeredDevices', JSON.stringify([currentDevice]));
        }
    }, []);

    const handleAddDevice = () => {
        alert('In a real implementation, this would:\n\n1. Prompt for biometric authentication\n2. Create new WebAuthn credential\n3. Register public key with Lazorkit smart wallet\n4. Link to your existing wallet\n\nFor demo: New device would be added to the list below.');
    };

    const handleRemoveDevice = (deviceId: number) => {
        const updated = devices.filter(d => d.id !== deviceId);
        setDevices(updated);
        localStorage.setItem('registeredDevices', JSON.stringify(updated));
    };

    const handleExportWallet = () => {
        // In real implementation, this would export wallet data
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

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Security & Devices</h2>

            {/* Passkey Devices */}
            <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                            <ShieldCheckIcon size={20} className="text-green-400" weight="bold" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Registered Passkeys</h3>
                            <p className="text-sm text-zinc-400">Devices with access to your wallet</p>
                        </div>
                    </div>
                    <button
                        onClick={handleAddDevice}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-all flex items-center gap-2"
                    >
                        <PlusIcon size={16} weight="bold" />
                        Add Device
                    </button>
                </div>

                <div className="space-y-3">
                    {devices.map((device) => (
                        <div
                            key={device.id}
                            className="p-4 bg-black/30 rounded-xl border border-white/5 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                                    {device.type === 'mobile' ? (
                                        <DeviceMobileIcon size={20} className="text-zinc-400" />
                                    ) : (
                                        <DesktopIcon size={20} className="text-zinc-400" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-white">{device.name}</p>
                                        {device.current && (
                                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-500">Added {device.date}</p>
                                </div>
                            </div>
                            {!device.current && (
                                <button
                                    onClick={() => handleRemoveDevice(device.id)}
                                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
                                >
                                    <TrashIcon size={18} className="text-zinc-600 group-hover:text-red-400" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Wallet Backup */}
            <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                        <DownloadIcon size={20} className="text-orange-400" weight="bold" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Wallet Backup</h3>
                        <p className="text-sm text-zinc-400">Export your wallet for safekeeping</p>
                    </div>
                </div>

                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl mb-4">
                    <p className="text-sm text-orange-200/80">
                        ⚠️ <strong>Important:</strong> Store your backup in a secure location. Never share it with anyone.
                    </p>
                </div>

                <button
                    onClick={handleExportWallet}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    <DownloadIcon size={18} weight="bold" />
                    Export Wallet Backup
                </button>
            </div>

            {/* Security Info */}
            <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                        <KeyIcon size={20} className="text-blue-400" weight="bold" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Passkey Security</h3>
                        <p className="text-sm text-zinc-400">How your wallet is protected</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <ShieldCheckIcon size={18} className="text-green-400 shrink-0 mt-1" weight="bold" />
                        <div>
                            <p className="text-sm font-medium text-white">Biometric Authentication</p>
                            <p className="text-xs text-zinc-500">Fingerprint, Face ID, or PIN required</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <ShieldCheckIcon size={18} className="text-green-400 shrink-0 mt-1" weight="bold" />
                        <div>
                            <p className="text-sm font-medium text-white">Hardware-Level Security</p>
                            <p className="text-xs text-zinc-500">Keys stored in secure enclave</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <ShieldCheckIcon size={18} className="text-green-400 shrink-0 mt-1" weight="bold" />
                        <div>
                            <p className="text-sm font-medium text-white">No Seed Phrases</p>
                            <p className="text-xs text-zinc-500">Eliminates phishing and loss risks</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Account */}
            <div className="bg-zinc-900/60 backdrop-blur-md border border-red-500/20 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                        <TrashIcon size={20} className="text-red-400" weight="bold" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Delete Account & Data</h3>
                        <p className="text-sm text-zinc-400">Permanently remove all data and reset wallet</p>
                    </div>
                </div>

                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
                    <p className="text-sm text-red-200/80 mb-2">
                        ⚠️ <strong>This action cannot be undone!</strong> This will:
                    </p>
                    <ul className="text-xs text-red-200/60 space-y-1 ml-4">
                        <li>• Clear all subscriptions and profile data</li>
                        <li>• Disconnect your wallet session</li>
                        <li>• Remove all app data from this browser</li>
                    </ul>
                    <p className="text-xs text-red-200/60 mt-2">
                        Note: To fully reset, you'll also need to delete the passkey from your browser settings.
                    </p>
                </div>

                <button
                    onClick={() => {
                        if (window.confirm('Are you ABSOLUTELY sure? This will delete ALL your data and cannot be undone!')) {
                            // Clear all localStorage
                            localStorage.clear();
                            // Redirect to home
                            window.location.href = '/';
                        }
                    }}
                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    <TrashIcon size={18} weight="bold" />
                    Delete Account & All Data
                </button>
            </div>
        </div>
    );
}
