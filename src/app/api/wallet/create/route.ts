import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as kaspa from '@kluster/kaspa-wasm-web';
import { encrypt } from '@/utils/encryption';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Node.js runtime for WASM + fs
export const runtime = 'nodejs';

// WASM hack for Node environment
// @ts-ignore
if (typeof global !== 'undefined' && !global.WebSocket) {
    // @ts-ignore
    global.WebSocket = globalThis.WebSocket;
}

let isWasmInitialized = false;

export async function POST(request: Request) {
    try {
        // 1. Authenticate User via Supabase Token
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

        // 2. Initialize WASM robustly
        if (!isWasmInitialized) {
            const wasmPath = path.join(process.cwd(), 'public', 'kaspa_wasm_bg.wasm');
            const wasmBuffer = fs.readFileSync(wasmPath);
            await kaspa.default(wasmBuffer);
            isWasmInitialized = true;
        }

        // 3. Generate New Wallet (Standardized)
        const randomSecret = crypto.randomBytes(32).toString('hex');
        const privateKey = new kaspa.PrivateKey(randomSecret);
        const publicKey = privateKey.toPublicKey();
        const address = publicKey.toAddress(kaspa.NetworkType.Testnet).toString();
        const privateKeyHex = privateKey.toString();

        console.log(`🆕 Created Custodial Wallet: ${address}`);

        // 4. Encrypt Private Key
        const encryptedKey = encrypt(privateKeyHex);

        // 5. Save to Supabase
        // We update the user's profile with their new wallet info
        // 5. Save to Supabase (Upsert ensures profile exists)
        // We update the user's profile with their new wallet info, or create it if missing
        const { error: dbError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                wallet_address: address,
                encrypted_private_key: encryptedKey,
                email: user.email,
                updated_at: new Date().toISOString()
            });

        if (dbError) {
            console.error('DB Upsert Error:', dbError);
            return NextResponse.json({ error: 'Failed to save wallet to profile' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            address: address,
            message: 'Custodial wallet created successfully'
        });

    } catch (error: any) {
        console.error('Wallet Creation Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
