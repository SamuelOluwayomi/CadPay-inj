import { NextResponse } from 'next/server';

/**
 * DEPRECATED: This endpoint has been replaced with client-side signing
 * 
 * ❌ Old Flow (Custodial - Backend Signing):
 * Client -> /api/wallet/send -> Backend signs with private key -> Broadcast
 * 
 * ✅ New Flow (Non-Custodial - Client-Side Signing):
 * Client unlocks wallet -> Signs transaction in browser -> /api/wallet/broadcast
 * 
 * Migration Guide:
 * - Use UnifiedSendModal component for all transactions
 * - Private keys stay in browser (IndexedDB) encrypted with user password
 * - Backend only broadcasts pre-signed transactions via /api/wallet/broadcast
 */
export async function POST(request: Request) {
    return NextResponse.json({
        error: 'This endpoint is deprecated. Please use client-side signing through the Send Funds modal.',
        deprecated: true,
        migrationGuide: {
            oldFlow: 'Server-side signing with custodial keys',
            newFlow: 'Client-side signing with password-protected keys in browser storage',
            broadcastEndpoint: '/api/wallet/broadcast',
            uiComponent: 'UnifiedSendModal (components/shared/UnifiedSendModal.tsx)'
        }
    }, { status: 410 }); // 410 Gone - Resource permanently moved
}
