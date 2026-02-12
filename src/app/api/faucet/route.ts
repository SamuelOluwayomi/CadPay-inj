import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 1. Use Node.js Runtime (Max size: 50MB) - Solves the "4.28MB" error
export const runtime = 'nodejs';

// 2. Import the WASM library
import * as kaspa from '@kluster/kaspa-wasm-web';

// Polyfill WebSocket for Node.js environment (required by kaspa-wasm-web)
// @ts-ignore
if (typeof global !== 'undefined' && !global.WebSocket) {
    // @ts-ignore
    global.WebSocket = globalThis.WebSocket;
}

// Cache the initialized WASM to avoid re-fetching on every request
let isWasmInitialized = false;

export async function POST(request: Request) {
    let rpc: any = null;
    try {
        const { address, amount } = await request.json();
        const faucetKey = process.env.FAUCET_PRIVATE_KEY;

        if (!address) {
            return NextResponse.json({ error: 'No address provided' }, { status: 400 });
        }
        if (!faucetKey) {
            console.error("❌ Missing FAUCET_PRIVATE_KEY in environment");
            return NextResponse.json({ error: 'Faucet configuration error' }, { status: 500 });
        }

        // --- THE FIX: Self-Fetch Strategy --- (Omitted for brevity, assumed unchanged)
        // --- THE FIX: Self-Fetch Strategy --- (Omitted for brevity, assumed unchanged)
        if (!isWasmInitialized) {
            // New robustness: Load WASM from filesystem in production/Node environment
            // Avoids fetching from own deployed URL (which can fail due to cold starts/loops)
            const wasmPath = path.join(process.cwd(), 'public', 'kaspa_wasm_bg.wasm');
            console.log(`[Faucet API] Loading WASM from: ${wasmPath}`);

            if (!fs.existsSync(wasmPath)) {
                console.error(`[Faucet API] WASM file NOT FOUND at: ${wasmPath}`);
                return NextResponse.json({
                    error: `Server Configuration Error: WASM file missing at ${wasmPath}`,
                    details: "Please verify deployment includes public assets."
                }, { status: 500 });
            }

            try {
                const wasmBuffer = fs.readFileSync(wasmPath);
                await kaspa.default(wasmBuffer);
                isWasmInitialized = true;
                console.log("[Faucet API] WASM Initialized Successfully");
            } catch (wasmError: any) {
                console.error("[Faucet API] Failed to initialize WASM:", wasmError);
                return NextResponse.json({
                    error: "Server Error: Failed to initialize Kaspa WASM",
                    details: wasmError.message
                }, { status: 500 });
            }
        }

        console.log(`💧 Faucet request for: ${address}, Amount: ${amount || 1000}`);

        // 3. Setup RPC
        rpc = new kaspa.RpcClient({
            url: "wss://photon-10.kaspa.red/kaspa/testnet-10/wrpc/borsh",
            encoding: kaspa.Encoding.Borsh,
            networkId: "testnet-10"
        });

        await rpc.connect();

        // 4. Setup Faucet Wallet
        const privateKey = new kaspa.PrivateKey(faucetKey);
        const sourceAddress = privateKey.toAddress(kaspa.NetworkType.Testnet);

        // 5. Fetch UTXOs
        const { entries } = await rpc.getUtxosByAddresses([sourceAddress.toString()]);

        if (!entries || entries.length === 0) {
            await rpc.disconnect();
            return NextResponse.json({ error: "Faucet wallet is empty." }, { status: 500 });
        }

        // 6. Create Transaction
        // Use requested amount or default to 1000 KAS
        const requestedAmount = amount ? BigInt(amount) : 1000n;
        const amountSompi = requestedAmount * 100_000_000n;

        console.log(`💸 Creating transaction for ${amountSompi} sompi (${requestedAmount} KAS)...`);

        const generator = new kaspa.Generator({
            outputs: [{
                address: address,
                amount: amountSompi
            }],
            changeAddress: sourceAddress.toString(),
            entries: entries,
            networkId: "testnet-10",
            feeRate: 1.0,
            priorityFee: 0n
        });

        // 7. Generate and Sign
        console.log(`🔨 Generating transaction...`);
        const pendingTx = await generator.next();

        if (!pendingTx) {
            console.error("❌ Failed to generate transaction");
            await rpc.disconnect();
            return NextResponse.json({
                error: "Failed to generate transaction. Insufficient funds?"
            }, { status: 500 });
        }

        console.log(`✍️ Signing transaction...`);
        // Fix: Pass the key as a string to bypass WASM instanceof check failure
        await pendingTx.sign([privateKey.toString()]);

        // 8. Submit Transaction
        console.log(`📤 Broadcasting transaction...`);
        const txId = await pendingTx.submit(rpc);

        console.log(`✅ SUCCESS! TxID: ${txId}`);

        await rpc.disconnect();

        return NextResponse.json({
            success: true,
            txId: txId,
            message: "Funds sent successfully from Private Faucet!",
            amount: Number(requestedAmount)
        });

    } catch (error: any) {
        console.error("❌ Faucet Error:", error.message || error);
        if (error.stack) {
            console.error("Stack:", error.stack);
        }

        if (rpc) {
            try {
                await rpc.disconnect();
            } catch (e) {
                console.warn("⚠️ Error disconnecting RPC:", e);
            }
        }

        return NextResponse.json({
            error: error.message || "Transaction failed",
            details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
        }, { status: 500 });
    }
}
