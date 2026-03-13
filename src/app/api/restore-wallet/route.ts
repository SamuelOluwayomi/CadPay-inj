import { NextRequest, NextResponse } from 'next/server';
import { Mnemonic, PrivateKey } from '@injectivelabs/sdk-ts';

/**
 * API Route to restore Injective wallet from mnemonic
 */
export async function POST(request: NextRequest) {
    try {
        const { mnemonic } = await request.json();

        if (!mnemonic) {
            return NextResponse.json(
                { success: false, error: 'Mnemonic is required' },
                { status: 400 }
            );
        }

        // Restore Injective Wallet
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
        console.error('Injective wallet restoration error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to restore Injective wallet',
            },
            { status: 500 }
        );
    }
}
