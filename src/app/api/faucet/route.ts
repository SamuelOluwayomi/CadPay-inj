import { NextResponse } from 'next/server';
import { transferInj } from '@/lib/injective-wallet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { address, amount } = await request.json();
        const rawKey = process.env.MASTER_FAUCET_PRIVATE_KEY || process.env.MASTER_FAUCET_MNEMONIC;
        const faucetKey = rawKey?.replace(/['"\s\n\r]/g, '').trim();

        if (!address) {
            return NextResponse.json({ error: 'No address provided' }, { status: 400 });
        }
        if (!faucetKey) {
            console.error("❌ Missing or empty MASTER_FAUCET_PRIVATE_KEY/MNEMONIC in environment");
            return NextResponse.json({ error: 'Faucet configuration error: Missing credentials' }, { status: 500 });
        }

        console.log(`💧 Injective Faucet request for: ${address}, Amount: ${amount || 2}`);

        const requestedAmount = amount ? Number(amount) : 2;

        // Perform transfer using the faucet key (hex or mnemonic)
        const txHash = await transferInj({
            mnemonicOrKey: faucetKey,
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
