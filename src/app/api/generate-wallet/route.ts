import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route to generate Kaspa wallet
 * This runs on the server-side where Node.js require() is available
 */
export async function POST(request: NextRequest) {
    try {
        const { network = 'testnet-10' } = await request.json();

        // Dynamic import of the Kaspa WASM module (server-side only)
        const Kaspa = await import('@kluster/kaspa-wasm-web');

        // Initialize WASM
        try {
            // @ts-ignore
            await Kaspa.default();
        } catch (e) {
            // Already loaded
        }

        // Generate Mnemonic
        const mnemonic = Kaspa.Mnemonic.random();
        const mnemonicString = mnemonic.phrase;

        // Convert mnemonic to seed using instance method
        const seed = mnemonic.toSeed();

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
                mnemonic: mnemonicString,
                address: address.toString(),
                publicKey: pubkey.toString(),
                seed: seed,
            },
        });
    } catch (error: any) {
        console.error('Wallet generation error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to generate Kaspa wallet',
            },
            { status: 500 }
        );
    }
}
