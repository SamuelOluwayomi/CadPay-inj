import { NextResponse } from 'next/server';
// @ts-ignore
const kaspa = require('@kaspa/core-lib');

export async function POST(request: Request) {
    try {
        const { address } = await request.json();
        const faucetKey = process.env.FAUCET_PRIVATE_KEY;

        // 1. Validation
        if (!address) {
            return NextResponse.json({ error: 'No address provided' }, { status: 400 });
        }
        if (!faucetKey) {
            console.error("❌ Missing FAUCET_PRIVATE_KEY in .env.local");
            return NextResponse.json({ error: 'Faucet configuration error' }, { status: 500 });
        }

        // 2. Setup the Faucet Wallet
        console.log("🔑 Setting up faucet wallet...");
        const privateKey = new kaspa.PrivateKey(faucetKey);
        const sourceAddress = privateKey.toAddress(kaspa.Networks.testnet).toString();

        console.log(`💧 Faucet sending from: ${sourceAddress}`);

        // 3. Fetch UTXOs from Testnet-10 API
        console.log("📡 Fetching faucet UTXOs...");

        // Try Testnet-10 specific endpoint first
        let utxoRes = await fetch(`https://api.kaspa.org/addresses/${sourceAddress}/utxos?limit=10`);

        if (!utxoRes.ok) {
            console.warn("⚠️ Main API failed, trying testnet-10 endpoint...");
            // Fallback to alternative endpoint if needed
            utxoRes = await fetch(`https://api-testnet-10.kaspanet.io/addresses/${sourceAddress}/utxos`);
        }

        if (!utxoRes.ok) {
            const errorText = await utxoRes.text();
            console.error("❌ UTXO fetch failed:", errorText);
            throw new Error("Could not fetch faucet balance from network");
        }

        const utxoData = await utxoRes.json();
        console.log(`📦 Found ${utxoData.length} UTXOs`);

        if (!utxoData || utxoData.length === 0) {
            console.error("❌ Faucet wallet is empty!");
            return NextResponse.json({
                error: "Faucet wallet is empty! Please refill the faucet address.",
                faucetAddress: sourceAddress
            }, { status: 500 });
        }

        // 4. Format UTXOs for the library
        console.log("🔄 Formatting UTXOs...");
        const utxos = utxoData.map((u: any) => ({
            txId: u.outpoint?.transactionId || u.transactionId,
            outputIndex: u.outpoint?.index || u.index,
            address: sourceAddress,
            script: u.utxoEntry?.scriptPublicKey?.scriptPublicKey || u.scriptPublicKey,
            satoshis: parseInt(u.utxoEntry?.amount || u.amount)
        }));

        // 5. Build the Transaction
        const amountToSend = 100 * 100000000; // 100 KAS (in Sompi)
        console.log(`💸 Creating transaction for ${amountToSend} sompi (100 KAS)...`);

        const tx = new kaspa.Transaction()
            .from(utxos)                  // Inputs
            .to(address, amountToSend)    // Output (User)
            .change(sourceAddress)        // Change (Back to Faucet)
            .sign(privateKey);            // Sign

        console.log("✍️ Transaction signed");

        // 6. Broadcast the Transaction
        console.log("📤 Broadcasting transaction...");
        const serializedTx = tx.serialize();

        // Handle serialization format
        const txPayload = typeof serializedTx === 'string'
            ? { transactionHex: serializedTx }
            : { transaction: serializedTx };

        // Try broadcasting
        let broadcastRes = await fetch('https://api.kaspa.org/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(txPayload)
        });

        if (!broadcastRes.ok) {
            console.warn("⚠️ Main broadcast API failed, trying testnet-10...");
            broadcastRes = await fetch('https://api-testnet-10.kaspanet.io/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(txPayload)
            });
        }

        if (!broadcastRes.ok) {
            const errText = await broadcastRes.text();
            console.error("❌ Broadcast failed:", errText);
            throw new Error(`Broadcast failed: ${errText}`);
        }

        const result = await broadcastRes.json();
        const txId = result.transactionId || result.txId || tx.id || "pending";

        console.log(`✅ SUCCESS! TxID: ${txId}`);

        return NextResponse.json({
            success: true,
            txId: txId,
            message: "Funds sent successfully from Private Faucet!",
            amount: 100
        });

    } catch (error: any) {
        console.error("❌ Faucet Error:", error.message || error);
        console.error("Stack:", error.stack);
        return NextResponse.json({
            error: error.message || "Transaction failed",
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
