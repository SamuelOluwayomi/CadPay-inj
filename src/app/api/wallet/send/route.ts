import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as kaspa from '@kluster/kaspa-wasm-web';
import { decrypt } from '@/utils/encryption';
import fs from 'fs';
import path from 'path';

// Node.js runtime for WASM + fs
export const runtime = 'nodejs';

let isWasmInitialized = false;

export async function POST(request: Request) {
    let rpc: any = null;
    try {
        // 1. Authenticate User
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

        const { recipient, amount } = await request.json();
        if (!recipient || !amount) {
            return NextResponse.json({ error: 'Missing recipient or amount' }, { status: 400 });
        }

        // 2. Fetch User's Encrypted Key
        const { data: profile } = await supabase
            .from('profiles')
            .select('encrypted_private_key, wallet_address')
            .eq('id', user.id)
            .single();

        if (!profile?.encrypted_private_key) {
            return NextResponse.json({ error: 'No wallet found for user.' }, { status: 404 });
        }

        // 3. Decrypt Key
        let privateKeyString: string;
        try {
            privateKeyString = decrypt(profile.encrypted_private_key);
        } catch (e) {
            console.error('Decryption failed:', e);
            return NextResponse.json({ error: 'Failed to access wallet securely' }, { status: 500 });
        }

        // 4. Initialize WASM (Robust Loading)
        if (!isWasmInitialized) {
            const wasmPath = path.join(process.cwd(), 'public', 'kaspa_wasm_bg.wasm');
            if (!fs.existsSync(wasmPath)) throw new Error("WASM file missing");
            const wasmBuffer = fs.readFileSync(wasmPath);

            if (typeof global !== 'undefined' && !(global as any).WebSocket) {
                (global as any).WebSocket = class { };
            }

            // @ts-ignore
            await kaspa.default(wasmBuffer);
            isWasmInitialized = true;
        }

        // 5. Connect RPC
        rpc = new kaspa.RpcClient({
            url: "wss://photon-10.kaspa.red/kaspa/testnet-10/wrpc/borsh",
            encoding: kaspa.Encoding.Borsh,
            networkId: "testnet-10"
        });
        await rpc.connect();

        // 6. Setup Wallet Keys
        const privateKey = new kaspa.PrivateKey(privateKeyString);
        const sourceAddress = privateKey.toAddress(kaspa.NetworkType.Testnet);

        console.log(`🚀 Sending ${amount} KAS from ${sourceAddress.toString()} to ${recipient}`);

        // 7. Fetch UTXOs via REST
        const utxoRes = await fetch(`https://api-tn10.kaspa.org/addresses/${sourceAddress.toString()}/utxos`);
        if (!utxoRes.ok) throw new Error("Failed to fetch UTXOs from REST API");

        const utxoData = await utxoRes.json();

        if (utxoData.length === 0) {
            return NextResponse.json({ error: "Insufficient funds (0 UTXOs)" }, { status: 400 });
        }

        // 8. Map UTXOs for Generator
        // FIX: scriptPublicKey must be the hex string, not the object.
        const entries = utxoData.map((u: any) => ({
            address: sourceAddress,
            outpoint: {
                transactionId: u.outpoint.transactionId,
                index: u.outpoint.index
            },
            utxoEntry: {
                amount: BigInt(u.utxoEntry.amount),
                scriptPublicKey: u.utxoEntry.scriptPublicKey.scriptPublicKey, // <--- DIRECT HEX STRING
                blockDaaScore: BigInt(u.utxoEntry.blockDaaScore),
                isCoinbase: u.utxoEntry.isCoinbase || false
            }
        }));

        // 9. Generate & Sign Transaction
        const amountSompi = BigInt(Math.floor(Number(amount) * 100_000_000));

        const generator = new kaspa.Generator({
            outputs: [{
                address: recipient,
                amount: amountSompi
            }],
            changeAddress: sourceAddress.toString(),
            entries: entries,
            networkId: "testnet-10",
            feeRate: 1.0,
            priorityFee: 0n
        });

        const pendingTx = await generator.next();
        if (!pendingTx) {
            await rpc.disconnect();
            return NextResponse.json({ error: 'Failed to generate transaction (insufficient funds?)' }, { status: 400 });
        }

        await pendingTx.sign([privateKey.toString()]);
        const txId = await pendingTx.submit(rpc);

        console.log(`✅ Transaction Sent: ${txId}`);
        await rpc.disconnect();

        return NextResponse.json({
            success: true,
            txId: txId,
            message: 'Transaction sent successfully'
        });

    } catch (error: any) {
        console.error("Send Error:", error);
        if (rpc) {
            try { await rpc.disconnect(); } catch { }
        }
        return NextResponse.json({ error: error.message || "Transaction failed" }, { status: 500 });
    }
}
