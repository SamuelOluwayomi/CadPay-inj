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
        const { userId, name, durationMovies } = await request.json(); // user_address might be passed, but we verify via token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
        }

        // 2. Initialize WASM robustly
        if (!isWasmInitialized) {
            const wasmPath = path.join(process.cwd(), 'public', 'kaspa_wasm_bg.wasm');
            const wasmBuffer = fs.readFileSync(wasmPath);
            await kaspa.default(wasmBuffer);
            isWasmInitialized = true;
        }

        // 3. Generate New Wallet for the POT
        const randomSecret = crypto.randomBytes(32).toString('hex');
        // @ts-ignore
        const privateKey = new kaspa.PrivateKey(randomSecret);
        const publicKey = privateKey.toPublicKey();
        const address = publicKey.toAddress(kaspa.NetworkType.Testnet).toString();
        const privateKeyHex = privateKey.toString();

        console.log(`🆕 Created Pot Address: ${address}`);

        // 4. Encrypt Private Key (Required for withdrawal later)
        const encryptedKey = encrypt(privateKeyHex);

        // 5. Verify Auth & Database Connection
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: authHeader || '' } }
            }
        );

        // 6. Save to savings_pots table
        // We store the encrypted private key so the pot can be swept/withdrawn later.
        const { error: dbError } = await supabase
            .from('savings_pots')
            .insert({
                user_address: userId, // Owner
                name: name,
                address: address, // Pot Address
                encrypted_private_key: encryptedKey,
                duration_months: durationMovies,
                status: 'active'
            });

        if (dbError) {
            console.error('Failed to save pot to DB:', dbError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            address: address,
            // encryptedKey: encryptedKey, // No need to return key if saved to DB
            message: 'Pot wallet created successfully'
        });

    } catch (error: any) {
        console.error('Pot Creation Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
