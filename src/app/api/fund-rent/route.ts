import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to fund rent for account creation from treasury
 * Used for savings pot creation - treasury pays the rent upfront
 */
export async function POST(req: NextRequest) {
    try {
        const { accountAddress, rentAmount } = await req.json();

        if (!accountAddress) {
            return NextResponse.json({ error: 'Missing accountAddress' }, { status: 400 });
        }

        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");

        const rawKey = process.env.TREASURY_SECRET_KEY;
        if (!rawKey) {
            console.log("Treasury key missing in environment");
            throw new Error("Treasury key missing in environment");
        }

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

        // Use provided rentAmount or calculate minimum rent
        let amount: number;
        if (rentAmount && rentAmount > 0) {
            amount = rentAmount;
        } else {
            // Default: calculate rent for a typical account (savings pot is ~97 bytes)
            amount = await connection.getMinimumBalanceForRentExemption(97);
        }

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: treasury.publicKey,
                toPubkey: new PublicKey(accountAddress),
                lamports: amount,
            })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = treasury.publicKey;

        const signature = await connection.sendTransaction(transaction, [treasury]);

        console.log(`Funded ${accountAddress} with ${amount / LAMPORTS_PER_SOL} SOL for rent. Signature: ${signature}`);

        return NextResponse.json({ success: true, signature, amount });
    } catch (error: any) {
        console.error("Fund rent error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
