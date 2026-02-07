'use client';

import { useState } from 'react';
import { useKasWare } from '@/hooks/useKasWare';
import { useFundRequests } from '@/hooks/useFundRequests';
import { CheckCircleIcon, XCircleIcon, ClockIcon, CopyIcon } from '@phosphor-icons/react';
import Link from 'next/link';

export default function AdminPage() {
    const { address, isConnected, connect } = useKasWare();
    const { pendingRequests, isLoading, updateRequestStatus, refetch } = useFundRequests();
    const [processing, setProcessing] = useState<string[]>([]);

    const handleApprove = async (request: any) => {
        if (!isConnected || !address) {
            alert('Please connect your admin wallet first');
            return;
        }

        setProcessing([...processing, request.id]);

        try {
            // Convert sompi to KAS (divide by 100,000,000)
            const amountKAS = request.amount / 100_000_000;

            // For demo purposes, prompt admin to send via KasWare UI
            const confirmed = confirm(
                `Send ${amountKAS} KAS to:\n${request.user_address}\n\nThis will open KasWare. After sending, paste the transaction ID.`
            );

            if (!confirmed) {
                setProcessing(processing.filter(id => id !== request.id));
                return;
            }

            // Prompt for transaction ID
            const txId = prompt('Enter the transaction ID from KasWare:');

            if (!txId || txId.trim() === '') {
                throw new Error('Transaction ID is required');
            }

            console.log('Transaction ID:', txId);

            // Update request status
            await updateRequestStatus(request.id, 'approved', txId);

            alert(`✅ Request approved! TxID: ${txId}`);
            refetch();
        } catch (error: any) {
            console.error('Failed to approve request:', error);

            // Update request as failed
            await updateRequestStatus(request.id, 'failed', undefined, error.message);

            alert(`❌ Failed: ${error.message}`);
        } finally {
            setProcessing(processing.filter(id => id !== request.id));
        }
    };

    const handleApproveAll = async () => {
        if (!isConnected || !address) {
            alert('Please connect your admin wallet first');
            return;
        }

        if (!confirm(`Approve ${pendingRequests.length} pending requests?`)) {
            return;
        }

        for (const request of pendingRequests) {
            await handleApprove(request);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
                        <p className="text-zinc-500 mt-2">Manage fund requests</p>
                    </div>
                    <Link
                        href="/dashboard"
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
                    >
                        Back to Dashboard
                    </Link>
                </div>

                {/* Wallet Connection */}
                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 mb-8">
                    <h2 className="text-xl font-bold mb-4">Admin Wallet</h2>
                    {isConnected ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <div>
                                    <p className="text-sm text-zinc-400">Connected as</p>
                                    <p className="font-mono text-sm">{address?.slice(0, 20)}...{address?.slice(-10)}</p>
                                </div>
                            </div>
                            <button
                                onClick={copyToClipboard.bind(null, address || '')}
                                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <CopyIcon size={20} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={connect}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all"
                        >
                            Connect Admin Wallet
                        </button>
                    )}
                </div>

                {/* Pending Requests */}
                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold">
                            Pending Requests ({pendingRequests.length})
                        </h2>
                        {pendingRequests.length > 0 && (
                            <button
                                onClick={handleApproveAll}
                                disabled={!isConnected || processing.length > 0}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
                            >
                                Approve All
                            </button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12">
                            <span className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin inline-block" />
                        </div>
                    ) : pendingRequests.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            <ClockIcon size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No pending requests</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingRequests.map((request) => {
                                const isProcessing = processing.includes(request.id);
                                const amountKAS = request.amount / 100_000_000;

                                return (
                                    <div
                                        key={request.id}
                                        className="bg-black/50 border border-white/10 rounded-xl p-4 flex items-center justify-between"
                                    >
                                        <div className="flex-1">
                                            <p className="font-mono text-sm mb-2">
                                                {request.user_address}
                                            </p>
                                            <div className="flex items-center gap-4 text-sm text-zinc-400">
                                                <span>{amountKAS} KAS</span>
                                                <span>•</span>
                                                <span>{new Date(request.created_at).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleApprove(request)}
                                            disabled={!isConnected || isProcessing}
                                            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircleIcon size={20} />
                                                    Approve
                                                </>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
