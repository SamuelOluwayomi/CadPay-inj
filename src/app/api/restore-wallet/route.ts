import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route to restore Kaspa wallet from mnemonic
 * This runs on the server-side where Node.js require() is available
 */
export async function POST(request: NextRequest) {
    try {
        const { mnemonic, network = 'testnet-10' } = await request.json();

        if (!mnemonic) {
            return NextResponse.json(
                { success: false, error: 'Mnemonic is required' },
                { status: 400 }
            );
        }

        // Dynamic import of the Kaspa WASM module (server-side only)
        const Kaspa = await import('@kluster/kaspa-wasm-web');

        // Initialize WASM
        try {
            // @ts-ignore
            await Kaspa.default();
        } catch (e) {
            // Already loaded
        }

        // Recover mnemonic
        const mnemonicObj = new Kaspa.Mnemonic(mnemonic);

        // Convert mnemonic to seed using instance method
        const seed = mnemonicObj.toSeed();

        // Create Extended Private Key
        const xprv = new Kaspa.XPrv(seed);

        // Derivation Path: m/44'/111111'/0'/0/0 (Standard Kaspa)
        const path = xprv.derivePath("m/44'/111111'/0'/0/0");

        // Get Extended Public Key
        const xpub = path.toXPub();

        // Generate Address using createAddress function
        const pubkey = xpub.toPublicKey();
        const address = Kaspa.createAddress(pubkey, network);

        return NextResponse.json({
            success: true,
            wallet: {
                mnemonic: mnemonic,
                address: address.toString(),
                publicKey: pubkey.toString(),
            },
        });
    } catch (error: any) {
        console.error('Wallet restoration error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to restore Kaspa wallet',
            },
            { status: 500 }
        );
    }
}
