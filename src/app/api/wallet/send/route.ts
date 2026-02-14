// 1. FORCE PURE JS MODE
process.env.ECCLIB_JS = '1';
process.env.ECCSI_JS = '1';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
// @ts-ignore
const kaspa = require('@kaspa/core-lib');

// PATCH: Ensure testnet prefix
if (kaspa.Networks.testnet) {
    kaspa.Networks.testnet.prefix = 'kaspatest';
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
    console.log("🚀 [API] Transfer Request Started");

    try {
        const { userId, amount, toAddress } = await request.json();

        // 1. Fetch DB Data
        const { data: user } = await supabase
            .from('profiles')
            .select('wallet_address, encrypted_private_key')
            .eq('id', userId)
            .single();

        if (!user?.encrypted_private_key) throw new Error("No private key found.");

        // 2. Derive Address Object (Used for signing)
        const privateKey = new kaspa.PrivateKey(user.encrypted_private_key);
        const addressObj = privateKey.toAddress(kaspa.Networks.testnet);
        const derivedAddressString = addressObj.toString();

        console.log(`🔐 Derived Address String: ${derivedAddressString}`);
        console.log(`🏦 DB Address String:      ${user.wallet_address}`);

        // 3. ROBUST UTXO FETCHING (Fixes "map is not a function")
        // We try the DB address first (it usually has the funds).
        let targetAddress = user.wallet_address;
        let utxoRes = await fetch(`https://api-tn10.kaspa.org/addresses/${targetAddress}/utxos`);

        // If DB address fails/empty, try derived address
        if (!utxoRes.ok || (await utxoRes.clone().json()).length === 0) {
            console.log("⚠️ DB address empty or invalid. Trying Derived address...");
            targetAddress = derivedAddressString;
            utxoRes = await fetch(`https://api-tn10.kaspa.org/addresses/${targetAddress}/utxos`);
        }

        // Check if Request Failed completely
        if (!utxoRes.ok) {
            throw new Error(`Kaspa API Failed: ${utxoRes.status} ${utxoRes.statusText}`);
        }

        const utxoData = await utxoRes.json();

        // 4. Validate Data is an Array
        if (!Array.isArray(utxoData)) {
            console.error("❌ Kaspa API returned non-array:", utxoData);
            return NextResponse.json({ error: "Kaspa API Error: Unexpected response format" }, { status: 502 });
        }

        if (utxoData.length === 0) {
            return NextResponse.json({ error: "Insufficient funds (0 UTXOs found)" }, { status: 400 });
        }

        // 5. Map UTXOs (Now safe because we checked Array.isArray)
        const utxos = utxoData.map((u: any) => ({
            txId: u.outpoint.transactionId,
            outputIndex: u.outpoint.index,
            address: addressObj, // <--- PASSING THE OBJECT DIRECTLY (Bypasses checksum crash)
            script: u.utxoEntry.scriptPublicKey.scriptPublicKey,
            satoshis: Number(u.utxoEntry.amount)
        }));

        console.log(`⚙️ Building Transaction with ${utxos.length} UTXOs...`);

        // 6. Build & Sign
        const amountSompi = Math.floor(amount * 100000000);
        const tx = new kaspa.Transaction()
            .from(utxos)
            .to(toAddress, amountSompi)
            .setVersion(0)
            .change(addressObj)
            .sign(privateKey);

        // 7. Broadcast
        const broadcastRes = await fetch('https://api-tn10.kaspa.org/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionHex: tx.serialize() })
        });

        if (!broadcastRes.ok) throw new Error(await broadcastRes.text());

        const result = await broadcastRes.json();
        console.log(`✅ Success! TxID: ${result.transactionId}`);

        return NextResponse.json({ success: true, txId: result.transactionId });

    } catch (error: any) {
        console.error("🔥 API Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
