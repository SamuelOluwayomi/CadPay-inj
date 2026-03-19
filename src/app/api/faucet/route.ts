import { NextResponse } from 'next/server';
import { transferInj } from '@/lib/injective-wallet';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const { address, amount } = await request.json();
        const faucetSecret = process.env.MASTER_FAUCET_PRIVATE_KEY?.trim() || process.env.MASTER_FAUCET_MNEMONIC?.trim();

        if (!address) {
            return NextResponse.json({ error: 'No address provided' }, { status: 400 });
        }
        if (!faucetSecret) {
            console.error("❌ Missing MASTER_FAUCET_PRIVATE_KEY or MNEMONIC in environment");
            return NextResponse.json({ error: 'Faucet configuration error: Missing credentials' }, { status: 500 });
        }

        console.log(`💧 Injective Faucet request for: ${address}, Amount: ${amount || 5}`);

        const requestedAmount = amount ? Number(amount) : 5;

        // Perform transfer using the faucet secret (key or mnemonic)
        const txHash = await transferInj({
            privateKeyOrMnemonic: faucetSecret,
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
