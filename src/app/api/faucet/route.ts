import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Constants provided by user for Private Faucet
const FAUCET_PUBLIC_ID = process.env.FAUCET_PUBLIC_ID || "kaspatest:qzrr3jngvdkh4pupuqn0y2rrwg5x9g2tlwshygsql4d8vekc0nnewcec5rjay";
const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY || "498e0840fa10f733c284a81994a5a2ff77310e4205df81adacddb8b2f6128bfd";
const RPC_URL = "wss://photon-10.kaspa.red/kaspa/testnet-10/wrpc/borsh";

// Lazy load WASM to avoid issues with Next.js build/runtime
let kaspaModule: any = null;

async function getKaspa() {
    if (kaspaModule) return kaspaModule;

    // Dynamic import the JS glue
    // @ts-ignore
    console.log("DEBUG: Importing kaspa.js...");
    const kaspa = await import('../../../../vendor/kluster/kaspa-wasm-web/kaspa.js');
    console.log("DEBUG: kaspa.js imported successfully");

    // Load WASM buffer manually for Node.js environment
    const wasmPath = path.join(process.cwd(), 'vendor/kluster/kaspa-wasm-web/kaspa_bg.wasm');
    console.log("DEBUG: wasmPath:", wasmPath);

    if (!fs.existsSync(wasmPath)) {
        console.error("DEBUG: WASM file NOT found at path:", wasmPath);
        throw new Error(`WASM file not found at ${wasmPath}`);
    }

    const wasmBuffer = fs.readFileSync(wasmPath);
    console.log("DEBUG: WASM buffer loaded, size:", wasmBuffer.length);

    // Initialize WASM
    console.log("DEBUG: Initializing WASM...");
    await kaspa.default(wasmBuffer);
    console.log("DEBUG: WASM initialized successfully");

    kaspaModule = kaspa;
    return kaspa;
}

export async function POST(request: Request) {
    let rpc: any = null;
    try {
        const { address: destAddress } = await request.json();

        if (!destAddress || !destAddress.startsWith('kaspatest:')) {
            return NextResponse.json({ error: 'Invalid Kaspa Testnet address' }, { status: 400 });
        }

        console.log(`[PRIVATE VAULT] Funding request for ${destAddress}`);

        // Ensure WebSocket is available for Kaspa WASM in Node.js
        if (typeof global !== 'undefined' && !global.WebSocket) {
            console.log("DEBUG: Setting global.WebSocket shim using globalThis.WebSocket");
            // @ts-ignore
            global.WebSocket = globalThis.WebSocket;
        }

        // 1. Initialize Kaspa WASM
        console.log("DEBUG: Calling getKaspa()...");
        const kaspa = await getKaspa();

        // 2. Setup RPC Client
        console.log("DEBUG: Setting up RpcClient with URL:", RPC_URL);
        rpc = new kaspa.RpcClient({
            url: RPC_URL,
            networkId: "testnet-10"
        });

        console.log(`[PRIVATE VAULT] Connecting to RPC...`);
        try {
            await rpc.connect();
            console.log("DEBUG: RPC connected successfully");
        } catch (connErr: any) {
            console.error("DEBUG: RPC Connection Failed:", connErr);
            throw new Error(`Failed to connect to Kaspa RPC: ${connErr.message || connErr.toString()}`);
        }

        // 3. Setup Private Key
        const privateKey = new kaspa.PrivateKey(FAUCET_PRIVATE_KEY);
        console.log("DEBUG: Private key instantiated");

        // 4. Fetch UTXOs for the Faucet Vault
        console.log(`[PRIVATE VAULT] Fetching UTXOs for ${FAUCET_PUBLIC_ID}`);
        const { entries } = await rpc.getUtxosByAddresses([FAUCET_PUBLIC_ID]);
        console.log(`DEBUG: Found ${entries?.length || 0} UTXOs`);

        if (!entries || entries.length === 0) {
            console.error("DEBUG: Private Vault empty");
            throw new Error("Private Vault is empty or out of synchronized UTXOs");
        }

        // 5. Create Transaction
        const amountSompi = 100n * 100_000_000n;
        console.log(`[PRIVATE VAULT] Creating transaction for ${amountSompi.toString()} SOMPI`);

        const generator = new kaspa.Generator({
            outputs: [{
                address: destAddress,
                amount: amountSompi
            }],
            changeAddress: FAUCET_PUBLIC_ID,
            entries: entries,
            networkId: "testnet-10",
            feeRate: 1.0 // Standard fee rate
        });

        // 6. Generate and Sign
        console.log("DEBUG: Generating transaction...");
        const pendingTx = await generator.next();
        if (!pendingTx) {
            console.error("DEBUG: generator.next() returned null");
            throw new Error("Failed to generate transaction (possibly insufficient funds)");
        }

        console.log(`[PRIVATE VAULT] Signing transaction...`);
        await pendingTx.sign([privateKey]);
        console.log("DEBUG: Transaction signed successfully");

        // 7. Submit Transaction
        console.log(`[PRIVATE VAULT] Submitting transaction to network...`);
        const txId = await pendingTx.submit(rpc);

        console.log(`[PRIVATE VAULT] SUCCESS! TxID: ${txId}`);

        return NextResponse.json({
            success: true,
            txId: txId,
            message: "Funding successfully broadcasted from Private Vault",
            amount: 100
        });

    } catch (error: any) {
        console.error("[PRIVATE VAULT] ERROR:", error);
        return NextResponse.json({
            error: error.message || "Internal transaction error",
            details: error.toString()
        }, { status: 500 });
    } finally {
        if (rpc) {
            try {
                await rpc.disconnect();
            } catch (e) {
                console.warn("[PRIVATE VAULT] Cleanup error:", e);
            }
        }
    }
}
