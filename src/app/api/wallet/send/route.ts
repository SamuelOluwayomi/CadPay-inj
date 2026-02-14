// 1. FORCE PURE JS MODE
process.env.ECCLIB_JS = '1';
process.env.ECCSI_JS = '1';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/utils/encryption';

// @ts-ignore
const kaspa = require('@kaspa/core-lib');

// ---------------------------------------------------------
// 🚨 FINAL FIX: REGISTER CUSTOM NETWORK
// We create a custom network rule that matches your addresses.
// This tells the library: "If you see 'kaspatest:', it's valid."
// ---------------------------------------------------------
try {
    // Only add if it doesn't exist to prevent "Network already exists" errors on reload
    if (!kaspa.Networks.get('kaspa-hackathon')) {
        kaspa.Networks.add({
            name: 'kaspa-hackathon',
            alias: 'kaspatest', // Uses this alias to match the string
            prefix: 'kaspatest', // The prefix we want to support
            // These hex values are standard placeholders to satisfy the constructor
            pubkeyhash: 0x6f,
            privatekey: 0xef,
            scripthash: 0xc4,
            xpubkey: 0x043587cf,
            xprivkey: 0x04358394,
        });
        console.log("✅ Custom 'kaspatest' network registered");
    }
} catch (e) {
    console.log("⚠️ Network registration note:", e);
}

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

        // 2. Parse and Sanitize Input
        const { recipient, amount } = await request.json();

        if (!recipient || typeof recipient !== 'string') {
            return NextResponse.json({ error: "Invalid recipient address" }, { status: 400 });
        }
        if (!amount) {
            return NextResponse.json({ error: "Missing amount" }, { status: 400 });
        }

        const cleanRecipient = recipient.trim();
        console.log(`🎯 Target: ${cleanRecipient}`);

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

        // 5. Sender Address
        // We use "testnet" here because the private key was likely generated with the default testnet rules
        const privateKey = new kaspa.PrivateKey(privateKeyString);
        const senderAddressObj = privateKey.toAddress("testnet");

        // Fix the string for the API call (Visual only)
        const senderAddressString = senderAddressObj.toString().replace("bchtest:", "kaspatest:");
        console.log(`🔐 Sender: ${senderAddressString}`);

        // 6. Destination Address
        // 🚨 FIX: We simply pass the address string.
        // Because we registered the 'kaspatest' network above, the library should now
        // auto-detect it as valid instead of throwing "Mismatched network".
        const destinationAddressObj = new kaspa.Address(cleanRecipient);

        // 7. Get UTXOs
        let utxoRes = await fetch(`https://api-tn10.kaspa.org/addresses/${senderAddressString}/utxos`);

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

        // 8. Map UTXOs
        const utxos = utxoData.map((u: any) => ({
            txId: u.outpoint.transactionId,
            outputIndex: u.outpoint.index,
            address: senderAddressObj, // Sign with the Sender Object
            script: u.utxoEntry.scriptPublicKey.scriptPublicKey,
            satoshis: Number(u.utxoEntry.amount)
        }));

        console.log(`⚙️ Building Transaction with ${utxos.length} UTXOs...`);

        // 9. Check Balance
        const amountSompi = Math.floor(amount * 100000000);
        const fee = 10000;
        const totalInput = utxos.reduce((acc: number, curr: any) => acc + curr.satoshis, 0);

        if (totalInput < amountSompi + fee) {
            return NextResponse.json({ error: `Insufficient funds. Have: ${totalInput / 1e8} KAS, Need: ${(amountSompi + fee) / 1e8} KAS` }, { status: 400 });
        }

        // 10. Build & Sign
        const tx = new kaspa.Transaction()
            .from(utxos)
            .to(destinationAddressObj, amountSompi) // Pass the valid Destination Object
            .setVersion(0)
            .change(senderAddressObj)
            .sign(privateKey);

        // 11. Broadcast
        const broadcastRes = await fetch('https://api-tn10.kaspa.org/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionHex: tx.serialize() })
        });

        if (!broadcastRes.ok) throw new Error(await broadcastRes.text());

        const result = await broadcastRes.json();
        console.log(`✅ Success! TxID: ${result.transactionId}`);

        return NextResponse.json({
            success: true,
            txId: result.transactionId,
            message: 'Transaction sent successfully'
        });

    } catch (error: any) {
        console.error("🔥 API Error:", error.message);
        if (error.stack) console.error(error.stack);
        return NextResponse.json({ error: error.message || "Transaction failed" }, { status: 500 });
    }
}
