import { NextResponse } from 'next/server';
import { transferInj } from '@/lib/injective-wallet';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const { address, amount } = await request.json();
        const faucetMnemonic = process.env.MASTER_FAUCET_MNEMONIC;

        if (!address) {
            return NextResponse.json({ error: 'No address provided' }, { status: 400 });
        }
        if (!faucetMnemonic) {
            console.error("❌ Missing FAUCET_MNEMONIC in environment");
            return NextResponse.json({ error: 'Faucet configuration error' }, { status: 500 });
        }

        console.log(`💧 Injective Faucet request for: ${address}, Amount: ${amount || 1}`);

        const requestedAmount = amount ? Number(amount) : 1;

        // Perform transfer using the faucet mnemonic
        const txHash = await transferInj({
            mnemonic: faucetMnemonic,
            recipient: address,
            amount: requestedAmount
        });

        console.log(`✅ Injective Faucet SUCCESS! TxHash: ${txHash}`);

        return NextResponse.json({
            success: true,
            txId: txHash,
            message: "Funds sent successfully from Injective Faucet!",
            amount: requestedAmount
        });

    } catch (error: any) {
        console.error("❌ Injective Faucet Error:", error.message || error);
        return NextResponse.json({
            error: error.message || "Faucet transaction failed",
        }, { status: 500 });
    }
}
