import { NextResponse } from 'next/server';

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
        const { address } = await request.json();
        const faucetKey = process.env.FAUCET_PRIVATE_KEY;

        if (!address) {
            return NextResponse.json({ error: 'No address provided' }, { status: 400 });
        }
        if (!faucetKey) {
            console.error("❌ Missing FAUCET_PRIVATE_KEY in environment");
            return NextResponse.json({ error: 'Faucet configuration error' }, { status: 500 });
        }

        // --- THE FIX: Self-Fetch Strategy ---
        // Fetch WASM from our own public folder via HTTP
        if (!isWasmInitialized) {
            const host = request.headers.get('host');
            const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
            const wasmUrl = `${protocol}://${host}/kaspa_wasm_bg.wasm`;

            console.log(`🔄 Fetching WASM from: ${wasmUrl}`);

            const wasmResponse = await fetch(wasmUrl);
            if (!wasmResponse.ok) {
                throw new Error(`Failed to load WASM from public folder: ${wasmResponse.status} ${wasmResponse.statusText}`);
            }

            const wasmBuffer = await wasmResponse.arrayBuffer();
            console.log(`📦 WASM loaded, size: ${wasmBuffer.byteLength} bytes`);

            // Initialize the library with the downloaded buffer
            await kaspa.default(wasmBuffer);
            isWasmInitialized = true;
            console.log(`✅ WASM initialized successfully`);
        }
        // ------------------------------------

        console.log(`💧 Faucet request for: ${address}`);

        // 3. Setup RPC
        console.log(`🔗 Connecting to RPC...`);
        rpc = new kaspa.RpcClient({
            url: "wss://photon-10.kaspa.red/kaspa/testnet-10/wrpc/borsh",
            encoding: kaspa.Encoding.Borsh,
            networkId: "testnet-10"
        });

        await rpc.connect();
        console.log(`✅ RPC connected`);

        // 4. Setup Faucet Wallet
        const privateKey = new kaspa.PrivateKey(faucetKey);
        const sourceAddress = privateKey.toAddress(kaspa.NetworkType.Testnet);
        console.log(`🔑 Faucet address: ${sourceAddress.toString()}`);

        // 5. Fetch UTXOs
        console.log(`📡 Fetching UTXOs...`);
        const { entries } = await rpc.getUtxosByAddresses([sourceAddress.toString()]);

        if (!entries || entries.length === 0) {
            console.error("❌ Faucet wallet is empty");
            await rpc.disconnect();
            return NextResponse.json({
                error: "Faucet wallet is empty. Please refill.",
                faucetAddress: sourceAddress.toString()
            }, { status: 500 });
        }

        console.log(`📦 Found ${entries.length} UTXOs`);

        // 6. Create Transaction
        const amountSompi = 100n * 100_000_000n; // 100 KAS
        console.log(`💸 Creating transaction for ${amountSompi} sompi...`);

        const generator = new kaspa.Generator({
            outputs: [{
                address: address,
                amount: amountSompi
            }],
            changeAddress: sourceAddress.toString(),
            entries: entries,
            networkId: "testnet-10",
            feeRate: 1.0
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
        await pendingTx.sign([privateKey]);

        // 8. Submit Transaction
        console.log(`📤 Broadcasting transaction...`);
        const txId = await pendingTx.submit(rpc);

        console.log(`✅ SUCCESS! TxID: ${txId}`);

        await rpc.disconnect();

        return NextResponse.json({
            success: true,
            txId: txId,
            message: "Funds sent successfully from Private Faucet!",
            amount: 100
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
