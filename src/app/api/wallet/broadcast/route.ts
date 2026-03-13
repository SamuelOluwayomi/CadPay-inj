import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TxGrpcApi } from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';

export const runtime = 'nodejs';

/**
 * Broadcast a pre-signed transaction to the Injective network
 */
export async function POST(request: Request) {
    console.log("🚀 [API] Injective Broadcast Request Started");

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
        const { txRaw, network = 'testnet' } = await request.json();

        if (!txRaw) {
            return NextResponse.json({ error: "Missing raw transaction" }, { status: 400 });
        }

        console.log(`📡 Broadcasting Injective transaction for user: ${user.id}`);

        // 3. Initialize Injective Client
        const endpoints = getNetworkEndpoints(network === 'mainnet' ? Network.Mainnet : Network.Testnet);
        const txClient = new TxGrpcApi(endpoints.grpc);

        // 4. Broadcast
        const response = await txClient.broadcast(txRaw);

        if (response.code !== 0) {
            throw new Error(`Transaction failed with code ${response.code}: ${response.rawLog}`);
        }

        console.log(`✅ Injective Transaction broadcast successful! TxHash: ${response.txHash}`);

        return NextResponse.json({
            success: true,
            txId: response.txHash,
            message: 'Injective transaction broadcast successfully'
        });

    } catch (error: any) {
        console.error("🔥 Injective Broadcast Error:", error.message || error);
        return NextResponse.json({
            error: error.message || "Failed to broadcast Injective transaction"
        }, { status: 500 });
    }
}
