import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { userAddress } = await req.json();

        if (!userAddress) {
            return NextResponse.json({ error: 'Missing userAddress' }, { status: 400 });
        }

        const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");

        const rawKey = process.env.TREASURY_SECRET_KEY;
        if (!rawKey) {
            console.log("Key loaded check: false (missing in env)");
            throw new Error("Treasury key missing in environment");
        }
        console.log("Key loaded check: true");

        let secretKey: Uint8Array;
        try {
            if (rawKey.trim().startsWith('[')) {
                secretKey = new Uint8Array(JSON.parse(rawKey));
            } else {
                secretKey = bs58.decode(rawKey);
            }
        } catch (e) {
            console.error("Key format error:", e);
            throw new Error("Invalid TREASURY_SECRET_KEY format - must be [1,2,3...] or Base58 string");
        }

        const treasury = Keypair.fromSecretKey(secretKey);

        // 0.05 SOL is enough for rent + several transactions
        const amount = 0.05 * LAMPORTS_PER_SOL;

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: treasury.publicKey,
                toPubkey: new PublicKey(userAddress),
                lamports: amount,
            })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = treasury.publicKey;

        const signature = await connection.sendTransaction(transaction, [treasury]);

        console.log(`Funded ${userAddress} with ${amount / LAMPORTS_PER_SOL} SOL. Signature: ${signature}`);

        return NextResponse.json({ success: true, signature });
    } catch (error: any) {
        console.error("Faucet error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
