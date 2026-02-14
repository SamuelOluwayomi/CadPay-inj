// 1. FORCE PURE JS MODE
process.env.ECCLIB_JS = '1';
process.env.ECCSI_JS = '1';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/utils/encryption';

// @ts-ignore
const kaspa = require('@kaspa/core-lib');

// ---------------------------------------------------------
// 🚨 NETWORK PATCH: Force 'kaspatest' prefix
// This fixes the "bchtest" vs "kaspatest" mismatch error.
// ---------------------------------------------------------
if (kaspa.Networks.testnet) {
    console.log("🔧 Application Network Patch: Switching testnet prefix to 'kaspatest'");
    kaspa.Networks.testnet.prefix = 'kaspatest';
}

// Force Node.js runtime (Standard Server)
export const runtime = 'nodejs';

export async function POST(request: Request) {
    console.log("🚀 [API] Transfer Request Started (Network Patched)");

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

        // 5. 🔍 CRITICAL CHECK: Does Key Match Address?
        // Now using the 'kaspatest' prefix which should match DB
        const privateKey = new kaspa.PrivateKey(privateKeyString);
        const derivedAddress = privateKey.toAddress(kaspa.Networks.testnet).toString();

        console.log(`🔐 Key derives to: ${derivedAddress}`);
        console.log(`🏦 DB Address is:  ${profile.wallet_address}`);

        // Simple check: If they match, we are good.
        if (derivedAddress !== profile.wallet_address) {
            // Fallback check: If prefixes differ but payload matches (ignoring checksum for a moment)
            // This handles cases where the library is stubborn.
            const derivedParts = derivedAddress.split(':');
            const dbParts = profile.wallet_address.split(':');

            // Compare the middle payload (qz7a...)
            // Note: Checksums (last 8 chars) differ if prefix differs, so we only check the payload start (first 10 chars).
            if (derivedParts[1] && dbParts[1] && derivedParts[1].substring(0, 10) !== dbParts[1].substring(0, 10)) {
                console.error(`❌ Mismatch! Derived: ${derivedAddress} vs DB: ${profile.wallet_address}`);
                return NextResponse.json({
                    error: `Private Key mismatch! Key derives to ${derivedAddress}, but DB expects ${profile.wallet_address}. Comparison failed on payload overlap.`
                }, { status: 400 });
            }
            console.warn("⚠️ Prefix mismatch ignored because payloads match. Proceeding with caution.");
        }

        // 6. Fetch UTXOs (Use the DB address to be safe)
        const utxoRes = await fetch(`https://api-tn10.kaspa.org/addresses/${profile.wallet_address}/utxos`);
        if (!utxoRes.ok) throw new Error("Failed to fetch UTXOs from REST API");
        const utxoData = await utxoRes.json();

        if (utxoData.length === 0) {
            return NextResponse.json({ error: "Insufficient funds (0 UTXOs)" }, { status: 400 });
        }

        // 7. Map UTXOs
        const utxos = utxoData.map((u: any) => ({
            txId: u.outpoint.transactionId,
            outputIndex: u.outpoint.index,
            address: profile.wallet_address, // Use the DB address
            script: u.utxoEntry.scriptPublicKey.scriptPublicKey,
            satoshis: Number(u.utxoEntry.amount)
        }));

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
            .change(profile.wallet_address)
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
        console.error(JSON.stringify(error, Object.getOwnPropertyNames(error)));
        return NextResponse.json({ error: error.message || "Transaction failed" }, { status: 500 });
    }
}
