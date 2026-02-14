import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/utils/encryption';

// Import the native Kaspa WASM SDK
const kaspa = require('kaspa');

export const runtime = 'nodejs';

export async function POST(request: Request) {
    console.log("🚀 [API] Transfer Request Started (WASM SDK)");

    try {
        // ---------------------------------------------------------
        // 🚨 INITIALIZE WASM (Crucial Fix)
        // This fixes "n.export_public_keys is not a function"
        // We check if it's already running to avoid "already loaded" errors.
        // ---------------------------------------------------------
        if (!kaspa.PrivateKey) {
            await kaspa.default();
            console.log("✅ WASM SDK Initialized");
        }

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

        // 2. Parse and Sanitize Input
        const { recipient, amount } = await request.json();

        if (!recipient || typeof recipient !== 'string') {
            return NextResponse.json({ error: "Invalid recipient address" }, { status: 400 });
        }
        if (!amount) {
            return NextResponse.json({ error: "Missing amount" }, { status: 400 });
        }

        const cleanRecipient = recipient.trim();

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

        // 5. Re-create the Private Key (Natively)
        // The WASM SDK handles 'kaspatest' automatically. No prefix hacks needed.
        const privateKey = new kaspa.PrivateKey(privateKeyString);
        const sourceAddress = privateKey.toAddress(kaspa.NetworkType.Testnet);

        console.log(`🔐 Sender: ${sourceAddress.toString()}`);
        console.log(`🎯 Target: ${cleanRecipient}`);

        // 6. Get UTXOs
        const addressString = sourceAddress.toString();
        let utxoRes = await fetch(`https://api-tn10.kaspa.org/addresses/${addressString}/utxos`);

        // Fallback to DB address
        if (!utxoRes.ok || (await utxoRes.clone().json()).length === 0) {
            console.log("⚠️ Derived address empty. Checking DB address...");
            utxoRes = await fetch(`https://api-tn10.kaspa.org/addresses/${profile.wallet_address}/utxos`);
        }

        if (!utxoRes.ok) {
            throw new Error(`Kaspa API Failed: ${utxoRes.status} ${utxoRes.statusText}`);
        }

        const utxoData = await utxoRes.json();

        if (!Array.isArray(utxoData)) {
            console.error("❌ Kaspa API returned non-array:", utxoData);
            return NextResponse.json({ error: "Kaspa API Error: Unexpected response format" }, { status: 502 });
        }

        if (utxoData.length === 0) {
            return NextResponse.json({ error: "Insufficient funds (0 UTXOs)" }, { status: 400 });
        }

        // 7. Convert API UTXOs to WASM UtxoEntry format
        const utxoEntries = utxoData.map((u: any) => {
            return new kaspa.UtxoEntry(
                new kaspa.Outpoint(u.outpoint.transactionId, u.outpoint.index),
                new kaspa.UtxoEntryReference(
                    BigInt(u.utxoEntry.amount),
                    new kaspa.ScriptPublicKey(
                        u.utxoEntry.scriptPublicKey.version,
                        u.utxoEntry.scriptPublicKey.scriptPublicKey
                    ),
                    BigInt(u.utxoEntry.blockDaaScore),
                    u.utxoEntry.isCoinbase
                )
            );
        });

        console.log(`⚙️ Building Transaction with ${utxoEntries.length} UTXOs...`);

        // 8. Build Transaction (The WASM Way)
        const amountSompi = BigInt(Math.floor(amount * 100000000));
        const networkId = new kaspa.NetworkId(kaspa.NetworkType.Testnet);

        const settings = new kaspa.GeneratorSettings(
            utxoEntries,                                    // Inputs
            { [cleanRecipient]: amountSompi },             // Outputs
            sourceAddress,                                  // Change Address
            kaspa.PriorityFee.include(0n)                  // Fee (Standard)
        );

        const generator = new kaspa.Generator(settings);

        // 9. Sign
        const pendingTransaction = generator.generate_transaction();
        await pendingTransaction.sign([privateKey]);
        const tx = pendingTransaction.transaction;

        // 10. Broadcast
        const txJson = tx.to_json();
        const broadcastRes = await fetch('https://api-tn10.kaspa.org/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transaction: txJson })
        });

        if (!broadcastRes.ok) {
            throw new Error(`Broadcast failed: ${await broadcastRes.text()}`);
        }

        const result = await broadcastRes.json();
        console.log(`✅ Success! TxID: ${result.transactionId}`);

        return NextResponse.json({
            success: true,
            txId: result.transactionId,
            message: 'Transaction sent successfully'
        });

    } catch (error: any) {
        console.error("🔥 API Error:", error.message || error);
        if (error.stack) console.error(error.stack);
        return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
    }
}
