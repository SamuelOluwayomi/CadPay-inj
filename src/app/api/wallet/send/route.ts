import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/utils/encryption';

// @ts-ignore
const kaspa = require('@kaspa/core-lib');

// Force Node.js runtime (Standard Server)
export const runtime = 'nodejs';

export async function POST(request: Request) {
    console.log("🚀 [API] Transfer Request Started (WASM Mode)");

    // Vercel WASM Fix: @kaspa/core-lib needs the .wasm file to be traced set in next.config.js

    try {
        // 1. Authenticate User (Securely, using Headers)
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

        // 2. Parse Input (Secure)
        const { recipient, amount } = await request.json();
        // Note: We use the authenticated user's ID from the session, not the body, for security.

        if (!recipient || !amount) {
            return NextResponse.json({ error: "Missing required fields: recipient or amount" }, { status: 400 });
        }

        // 3. Fetch User's Encrypted Key
        const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_address, encrypted_private_key')
            .eq('id', user.id)
            .single();

        if (!profile) return NextResponse.json({ error: "User profile not found in DB" }, { status: 404 });
        if (!profile.encrypted_private_key) return NextResponse.json({ error: "User has no private key saved!" }, { status: 400 });

        // 4. Decrypt Key
        let privateKeyString: string;
        try {
            privateKeyString = decrypt(profile.encrypted_private_key);
        } catch (e) {
            console.error('Decryption failed:', e);
            return NextResponse.json({ error: 'Failed to access wallet securely' }, { status: 500 });
        }

        // 5. Fetch UTXOs
        const utxoRes = await fetch(`https://api-tn10.kaspa.org/addresses/${profile.wallet_address}/utxos`);
        if (!utxoRes.ok) throw new Error("Failed to fetch UTXOs from REST API");
        const utxoData = await utxoRes.json();

        if (utxoData.length === 0) {
            return NextResponse.json({ error: "Insufficient funds (0 UTXOs)" }, { status: 400 });
        }

        // 6. MAP UTXOs (Correctly for @kaspa/core-lib)
        const utxos = utxoData.map((u: any) => ({
            txId: u.outpoint.transactionId,
            outputIndex: u.outpoint.index,
            address: profile.wallet_address,
            script: u.utxoEntry.scriptPublicKey.scriptPublicKey,
            satoshis: Number(u.utxoEntry.amount)
        }));

        // 7. Check Balance
        const amountSompi = Math.floor(amount * 100000000);
        const fee = 10000;
        const totalInput = utxos.reduce((acc: number, curr: any) => acc + curr.satoshis, 0);

        if (totalInput < amountSompi + fee) {
            return NextResponse.json({ error: `Insufficient funds. Have: ${totalInput / 1e8} KAS, Need: ${(amountSompi + fee) / 1e8} KAS` }, { status: 400 });
        }

        // 8. Build Transaction
        // Note: The library will automatically load the WASM if configured correctly by Vercel
        const privateKey = new kaspa.PrivateKey(privateKeyString);

        const tx = new kaspa.Transaction()
            .from(utxos)
            .to(recipient, amountSompi)
            .setVersion(0)
            .change(profile.wallet_address)
            .sign(privateKey);

        // 9. Broadcast
        const broadcastRes = await fetch('https://api-tn10.kaspa.org/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionHex: tx.serialize() })
        });

        if (!broadcastRes.ok) throw new Error(await broadcastRes.text());

        const result = await broadcastRes.json();
        console.log(`🎉 [API] Success! TxID: ${result.transactionId}`);

        return NextResponse.json({
            success: true,
            txId: result.transactionId,
            message: 'Transaction sent successfully'
        });

    } catch (error: any) {
        console.error("🔥 [API ERROR]:", error.message);
        // Extended logging for debugging serverless errors
        console.error(JSON.stringify(error, Object.getOwnPropertyNames(error)));
        return NextResponse.json({ error: error.message || "Transaction failed" }, { status: 500 });
    }
}
