import { NextResponse } from 'next/server';

// 1. Force Edge Runtime (Compatible with Vercel's Edge Functions)
export const runtime = 'edge';

// 2. Lazy-load the WASM library
let kaspaModule: any = null;
let isInitialized = false;

async function initializeKaspa(request: Request) {
    if (isInitialized && kaspaModule) {
        return kaspaModule;
    }

    // Import the JS glue code
    const kaspa = await import('@kluster/kaspa-wasm-web');

    // Load WASM file from public folder (guaranteed to be deployed)
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const wasmUrl = `${proto}://${host}/kaspa_wasm_bg.wasm`;

    console.log(`🔄 Loading WASM from: ${wasmUrl}`);

    const response = await fetch(wasmUrl);
    if (!response.ok) {
        throw new Error(`Failed to load WASM file: ${response.status} ${response.statusText}`);
    }

    const wasmBuffer = await response.arrayBuffer();
    console.log(`📦 WASM loaded, size: ${wasmBuffer.byteLength} bytes`);

    // Initialize the library with the manual buffer
    await kaspa.default(wasmBuffer);
    console.log(`✅ WASM initialized successfully`);

    kaspaModule = kaspa;
    isInitialized = true;

    return kaspa;
}

export async function POST(request: Request) {
    let rpc: any = null;
    try {
        const { address } = await request.json();
        const faucetKey = process.env.FAUCET_PRIVATE_KEY;

        if (!address) {
            return NextResponse.json({ error: 'No address provided' }, { status: 400 });
        }
        if (!faucetKey) {
            console.error("❌ Missing FAUCET_PRIVATE_KEY");
            return NextResponse.json({ error: 'Faucet configuration error' }, { status: 500 });
        }

        console.log(`💧 Faucet request for: ${address}`);

        // Initialize Kaspa WASM
        const kaspa = await initializeKaspa(request);

        // Setup RPC Client (Public Testnet Node)
        console.log(`🔗 Connecting to RPC...`);
        rpc = new kaspa.RpcClient({
            url: "wss://photon-10.kaspa.red/kaspa/testnet-10/wrpc/borsh",
            encoding: kaspa.Encoding.Borsh,
            networkId: "testnet-10"
        });

        await rpc.connect();
        console.log(`✅ RPC connected`);

        // Setup Private Key and Address
        const privateKey = new kaspa.PrivateKey(faucetKey);
        const sourceAddress = privateKey.toAddress(kaspa.NetworkType.Testnet);
        console.log(`🔑 Faucet address: ${sourceAddress.toString()}`);

        // Fetch UTXOs
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

        // Create Transaction
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

        // Generate and Sign
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

        // Submit Transaction
        console.log(`📤 Broadcasting transaction...`);
        const txId = await pendingTx.submit(rpc);

        console.log(`✅ SUCCESS! TxID: ${txId}`);

        await rpc.disconnect();

        return NextResponse.json({
            success: true,
            txId: txId,
            message: "Funding successfully broadcasted from Private Faucet!",
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
            error: error.message || "Internal transaction error",
            details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
        }, { status: 500 });
    }
}
