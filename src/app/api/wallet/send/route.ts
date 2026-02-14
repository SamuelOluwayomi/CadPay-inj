// 1. FORCE PURE JS MODE
process.env.ECCLIB_JS = '1';
process.env.ECCSI_JS = '1';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/utils/encryption';

// @ts-ignore
const kaspa = require('@kaspa/core-lib');

// PATCH: Ensure testnet prefix
if (kaspa.Networks.testnet) {
    kaspa.Networks.testnet.prefix = 'kaspatest';
}

// Force Node.js runtime (Standard Server)
export const runtime = 'nodejs';

export async function POST(request: Request) {
    console.log("🚀 [API] Transfer Request Started");

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

        // 5. Derive Address Object (DO NOT convert to String)
        const privateKey = new kaspa.PrivateKey(privateKeyString);
        // This object is what we pass to the library functions to bypass string parsing
        const addressObj = privateKey.toAddress(kaspa.Networks.testnet);

        // We use the string only for fetching from API (which expects strings)
        const addressString = addressObj.toString();
        const dbAddressString = profile.wallet_address;

        console.log(`🔐 Derived Address String: ${addressString}`);
        console.log(`🏦 DB Address String:      ${dbAddressString}`);

        // 6. Get UTXOs (Fetch using the STRING)
        // We try fetching with the derived string first. If empty, try DB string as fallback.
        // This handles cases where the indexer might be using one format and the library another.
        let utxoRes = await fetch(`https://api-tn10.kaspa.org/addresses/${addressString}/utxos`);
        let utxoData = await utxoRes.json();

        if (!utxoData || utxoData.length === 0) {
            console.log("⚠️ Derived address empty. Trying DB address fallback...");
            utxoRes = await fetch(`https://api-tn10.kaspa.org/addresses/${dbAddressString}/utxos`);
            utxoData = await utxoRes.json();
        }

        if (!utxoData || utxoData.length === 0) {
            return NextResponse.json({ error: "Insufficient funds (0 UTXOs)" }, { status: 400 });
        }

        // 7. Map UTXOs
        // 🚨 FIX: Pass 'addressObj' (Object), NOT string.
        // This bypasses the "Invalid Checksum" parser crash when the string is re-parsed.
        const utxos = utxoData.map((u: any) => ({
            txId: u.outpoint.transactionId,
            outputIndex: u.outpoint.index,
            address: addressObj, // <--- PASSING THE OBJECT DIRECTLY
            script: u.utxoEntry.scriptPublicKey.scriptPublicKey,
            satoshis: Number(u.utxoEntry.amount)
        }));

        console.log("⚙️ Building Transaction...");

        // 8. Check Balance
        const amountSompi = Math.floor(amount * 100000000);
        const fee = 10000;
        const totalInput = utxos.reduce((acc: number, curr: any) => acc + curr.satoshis, 0);

        if (totalInput < amountSompi + fee) {
            return NextResponse.json({ error: `Insufficient funds. Have: ${totalInput / 1e8} KAS, Need: ${(amountSompi + fee) / 1e8} KAS` }, { status: 400 });
        }

        // 9. Build Transaction
        const tx = new kaspa.Transaction()
            .from(utxos)
            .to(recipient, amountSompi)
            .setVersion(0)
            .change(addressObj) // <--- PASS OBJECT HERE TOO
            .sign(privateKey);

        // 10. Broadcast
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
        if (error.stack) console.error(error.stack);
        return NextResponse.json({ error: error.message || "Transaction failed" }, { status: 500 });
    }
}
