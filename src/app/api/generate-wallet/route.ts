import { NextRequest, NextResponse } from 'next/server';
import { PrivateKey } from '@injectivelabs/sdk-ts';
import { Wallet } from 'ethers';

/**
 * API Route to generate Injective wallet
 */
export async function POST(request: NextRequest) {
    try {
        // Generate Injective Wallet
        const mnemonic = Wallet.createRandom().mnemonic?.phrase || "";
        const privateKey = PrivateKey.fromMnemonic(mnemonic);
        const address = privateKey.toBech32();
        const publicKey = privateKey.toPublicKey().toBase64();

        return NextResponse.json({
            success: true,
            wallet: {
                mnemonic: mnemonic,
                address: address,
                publicKey: publicKey,
            },
        });
    } catch (error: any) {
        console.error('Injective wallet generation error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to generate Injective wallet',
            },
            { status: 500 }
        );
    }
}
