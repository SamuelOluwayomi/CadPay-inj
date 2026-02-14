import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/utils/encryption';
import * as kaspa from '@kluster/kaspa-wasm-web';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

let isWasmInitialized = false;

export async function POST(request: Request) {
    try {
        const { userId, name, durationMonths } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is missing' }, { status: 400 });
        }

        const authHeader = request.headers.get('Authorization');

        // 1. Initialize WASM (Node.js compatible)
        if (!isWasmInitialized) {
            const wasmPath = path.join(process.cwd(), 'public', 'kaspa_wasm_bg.wasm');

            if (!fs.existsSync(wasmPath)) {
                throw new Error(`WASM file not found at ${wasmPath}`);
            }

            const wasmBuffer = fs.readFileSync(wasmPath);

            // Mock WebSocket for Node environment if needed by the library
            if (typeof global !== 'undefined' && !(global as any).WebSocket) {
                (global as any).WebSocket = class { };
            }

            // @ts-ignore - The library expects the WASM buffer in Node
            await kaspa.default(wasmBuffer);
            isWasmInitialized = true;
        }

        // 2. Generate Wallet
        console.log(`Generating wallet for pot: ${name}`);
        const mnemonic = kaspa.Mnemonic.random();
        const seed = mnemonic.toSeed();
        const xprv = new kaspa.XPrv(seed);
        const derivationPath = xprv.derivePath("m/44'/111111'/0'/0/0");
        const xpub = derivationPath.toXPub();
        const publicKey = xpub.toPublicKey();
        const address = publicKey.toAddress(kaspa.NetworkType.Testnet).toString();
        const privateKeyHex = mnemonic.phrase; // Store mnemonic for recovery, or xprv? Mnemonic is safer/standard.

        console.log(`🆕 Created Pot Address: ${address}`);

        // 3. Encrypt Private Key (Mnemonic)
        const encryptedKey = encrypt(privateKeyHex);

        // 4. Verify Auth & Database Connection
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: authHeader || '' } }
            }
        );

        // 5. Save to savings_pots table
        const { data, error: dbError } = await supabase
            .from('savings_pots')
            .insert({
                user_address: userId,
                name: name,
                address: address, // Pot Address
                encrypted_private_key: encryptedKey,
                duration_months: durationMonths,
                status: 'active',
                balance: 0,
                unlock_time: Math.floor(Date.now() / 1000) + (durationMonths * 30 * 24 * 60 * 60),
            })
            .select()
            .single();

        if (dbError) {
            console.error('Failed to save pot to DB:', dbError);
            return NextResponse.json({ error: 'Database error', details: dbError }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            pot: data, // Return the full pot object
            message: 'Pot wallet created successfully'
        });

    } catch (error: any) {
        console.error('Pot Creation Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
