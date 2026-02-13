import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as kaspa from '@kluster/kaspa-wasm-web';
import { decrypt } from '@/utils/encryption';
import fs from 'fs';
import path from 'path';

// Node.js runtime for WASM + fs
export const runtime = 'nodejs';

// WASM hack for Node environment
// @ts-ignore
if (typeof global !== 'undefined' && !global.WebSocket) {
    // @ts-ignore
    global.WebSocket = globalThis.WebSocket;
}

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
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('encrypted_private_key, wallet_address')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.encrypted_private_key) {
            return NextResponse.json({ error: 'No wallet found for user. Please create one first.' }, { status: 404 });
        }

        // 3. Decrypt Key
        let privateKeyString: string;
        try {
            privateKeyString = decrypt(profile.encrypted_private_key);
        } catch (e) {
            console.error('Decryption failed:', e);
            return NextResponse.json({ error: 'Failed to access wallet securely' }, { status: 500 });
        }

        // 4. Initialize WASM
        if (!isWasmInitialized) {
            const wasmPath = path.join(process.cwd(), 'public', 'kaspa_wasm_bg.wasm');
            const wasmBuffer = fs.readFileSync(wasmPath);
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

        // 6. Setup Wallet
        const privateKey = new kaspa.PrivateKey(privateKeyString);
        let sourceAddress = privateKey.toAddress(kaspa.NetworkType.Testnet);

        // Sanity Check: Does the derived address match the DB?
        if (profile.wallet_address && sourceAddress.toString() !== profile.wallet_address) {
            console.warn(`⚠️ Primary derivation (Testnet) mismatch. Probing other networks...`);

            // Fallback Probe (Just in case valid keys were made on other networks previously)
            const networks = [
                { type: kaspa.NetworkType.Mainnet, name: 'Mainnet' },
                { type: kaspa.NetworkType.Devnet, name: 'Devnet' },
                { type: kaspa.NetworkType.Simnet, name: 'Simnet' }
            ];

            let found = false;
            for (const net of networks) {
                const addr = privateKey.toAddress(net.type);
                if (addr.toString() === profile.wallet_address) {
                    sourceAddress = addr;
                    found = true;
                    console.log(`✅ Recovered address on ${net.name}`);
                    break;
                }
            }

            if (!found) {
                console.error(`🚨 CRITICAL: Private Key does not unlock stored address ${profile.wallet_address}`);
                return NextResponse.json({
                    error: `Wallet Corruption: Private key does not match address ${profile.wallet_address}. Please reset your wallet.`,
                    senderAddress: sourceAddress.toString()
                }, { status: 400 });
            }
        }

        console.log(`🚀 API STARTED for User: ${user.id}`);
        console.log(`🔐 DB WALLET (Resolved): ${sourceAddress.toString()}`);
        console.log(`🎯 TARGET: ${recipient}`);

        // 7. Fetch UTXOs via REST API (Reliable)
        // RPC is often desynced on testnet, so we use REST for valid UTXO set.
        console.log(`🔍 FETCHING UTXOS (REST): ${sourceAddress.toString()}`);
        let entries: any[] = [];

        try {
            const restRes = await fetch(`https://api-tn10.kaspa.org/addresses/${sourceAddress.toString()}/utxos`);
            if (!restRes.ok) {
                console.error("API Error:", await restRes.text());
                throw new Error(`REST API failed with status ${restRes.status}`);
            }
            const restUtxos = await restRes.json();
            console.log(`💰 UTXO COUNT: ${restUtxos.length}`);

            if (restUtxos.length === 0) {
                console.warn(`⚠️ Wallet ${sourceAddress.toString()} is empty!`);
            }

            // Map REST format to WASM-compatible format
            entries = restUtxos.map((u: any) => ({
                address: sourceAddress,
                outpoint: {
                    transactionId: u.outpoint.transactionId,
                    index: u.outpoint.index
                },
                utxoEntry: {
                    amount: BigInt(u.utxoEntry.amount),
                    scriptPublicKey: {
                        scriptPublicKey: u.utxoEntry.scriptPublicKey.scriptPublicKey,
                        version: 0
                    },
                    blockDaaScore: BigInt(u.utxoEntry.blockDaaScore),
                    isCoinbase: u.utxoEntry.isCoinbase || false
                }
            }));

        } catch (e) {
            console.error("REST UTXO Fetch Error:", e);
            // Fallback to RPC if REST fails (unlikely to be better if synced, but worth a try?)
            console.log("⚠️ Falling back to RPC for UTXOs...");
            const rpcRes = await rpc.getUtxosByAddresses([sourceAddress.toString()]);
            entries = rpcRes.entries || [];
        }

        if (!entries || entries.length === 0) {
            await rpc.disconnect();
            return NextResponse.json({
                error: 'Insufficient funds. Wallet appears empty.',
                senderAddress: sourceAddress.toString()
            }, { status: 400 });
        }

        // 8. Create & Sign Transaction
        const amountSompi = BigInt(Math.floor(Number(amount) * 100_000_000));

        const generator = new kaspa.Generator({
            outputs: [{
                address: recipient, // Destination (Pot Address)
                amount: amountSompi
            }],
            changeAddress: sourceAddress.toString(), // Send change back to user
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

        console.log(`✅ Custodial Tx Sent: ${txId}`);
        await rpc.disconnect();

        return NextResponse.json({
            success: true,
            txId: txId,
            message: 'Transaction sent successfully'
        });

    } catch (error: any) {
        console.error('Custodial Send Error:', error);
        if (rpc) {
            try { await rpc.disconnect(); } catch { }
        }
        return NextResponse.json({ error: error.message || 'Transaction failed' }, { status: 500 });
    }
}
