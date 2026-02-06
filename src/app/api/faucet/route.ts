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
    const kaspa = await import('../../../../vendor/kluster/kaspa-wasm-web/kaspa.js');

    // Load WASM buffer manually for Node.js environment
    const wasmPath = path.join(process.cwd(), 'vendor/kluster/kaspa-wasm-web/kaspa_bg.wasm');
    const wasmBuffer = fs.readFileSync(wasmPath);

    // Initialize WASM
    await kaspa.default(wasmBuffer);

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

        // 1. Initialize Kaspa WASM
        const kaspa = await getKaspa();

        // 2. Setup RPC Client
        rpc = new kaspa.RpcClient({
            url: RPC_URL,
            networkId: "testnet-10"
        });

        console.log(`[PRIVATE VAULT] Connecting to RPC: ${RPC_URL}`);
        await rpc.connect();

        // 3. Setup Private Key
        const privateKey = new kaspa.PrivateKey(FAUCET_PRIVATE_KEY);

        // 4. Fetch UTXOs for the Faucet Vault
        console.log(`[PRIVATE VAULT] Fetching UTXOs for ${FAUCET_PUBLIC_ID}`);
        const { entries } = await rpc.getUtxosByAddresses([FAUCET_PUBLIC_ID]);

        if (!entries || entries.length === 0) {
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
        const pendingTx = await generator.next();
        if (!pendingTx) {
            throw new Error("Failed to generate transaction (possibly insufficient funds)");
        }

        console.log(`[PRIVATE VAULT] Signing transaction...`);
        await pendingTx.sign([privateKey]);

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
