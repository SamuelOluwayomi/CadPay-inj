import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Broadcast a pre-signed transaction to the Kaspa network
 * This endpoint does NOT handle private keys - transactions are signed client-side
 */
export async function POST(request: Request) {
    console.log("🚀 [API] Broadcast Request Started");

    try {
        // 1. Authenticate User
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: authHeader } }
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Request
        const { signedTransaction, networkType = 'testnet-10' } = await request.json();

        if (!signedTransaction) {
            return NextResponse.json({ error: "Missing signed transaction" }, { status: 400 });
        }

        console.log(`📡 Broadcasting transaction for user: ${user.id}`);

        // 3. Determine API endpoint
        const apiUrl = networkType === 'mainnet'
            ? 'https://api.kaspa.org'
            : 'https://api-tn10.kaspa.org';

        // 4. Parse transaction (should already be JSON object)
        let txJson;
        try {
            txJson = typeof signedTransaction === 'string'
                ? JSON.parse(signedTransaction)
                : signedTransaction;
        } catch (e) {
            return NextResponse.json({ error: "Invalid transaction format" }, { status: 400 });
        }

        // 5. Broadcast to Kaspa network
        const broadcastRes = await fetch(`${apiUrl}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transaction: txJson })
        });

        if (!broadcastRes.ok) {
            const errorText = await broadcastRes.text();
            console.error(`❌ Broadcast failed: ${errorText}`);
            return NextResponse.json({
                error: `Broadcast failed: ${errorText}`
            }, { status: 502 });
        }

        const result = await broadcastRes.json();
        const txId = result.transactionId;

        console.log(`✅ Transaction broadcast successful! TxID: ${txId}`);

        // 6. (Optional) Record transaction in database for receipts
        // This is for UI purposes only - the blockchain is the source of truth
        try {
            // You can add transaction receipt recording here if needed
            // await supabase.from('receipts').insert({ user_id: user.id, tx_id: txId, ... });
        } catch (dbError) {
            // Don't fail the request if receipt recording fails
            console.warn('Failed to record receipt:', dbError);
        }

        return NextResponse.json({
            success: true,
            txId: txId,
            message: 'Transaction broadcast successfully'
        });

    } catch (error: any) {
        console.error("🔥 Broadcast Error:", error.message || error);
        if (error.stack) console.error(error.stack);
        return NextResponse.json({
            error: error.message || "Failed to broadcast transaction"
        }, { status: 500 });
    }
}
