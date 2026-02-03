/**
 * Kaspa wallet generation utilities
 * Using @kluster/kaspa-wasm-web with dynamic imports for Next.js compatibility
 */

export interface KaspaWallet {
    mnemonic: string;
    address: string;
    publicKey: string;
    seed?: string;
}

/**
 * Load Kaspa WASM module dynamically
 */
async function loadKaspa() {
    const Kaspa = await import('@kluster/kaspa-wasm-web');
    try {
        // @ts-ignore
        await Kaspa.default('kaspa_wasm_bg.wasm');
    } catch (e) {
        // Already loaded
    }
    return Kaspa;
}

/**
 * Generate a new Kaspa wallet
 */
export async function generateKaspaWallet(
    network: 'mainnet' | 'testnet-10' | 'testnet-11' = 'testnet-10' // Default to Testnet for Hackathon
): Promise<KaspaWallet> {
    try {
        const Kaspa = await loadKaspa();

        // 1. Generate Mnemonic
        const mnemonic = Kaspa.Mnemonic.random();
        const mnemonicString = mnemonic.phrase;
        const seed = Kaspa.Mnemonic.toSeed(mnemonic);

        // 2. Create Keys
        const xprv = new Kaspa.XPrv(seed);

        // 3. Derivation Path: m/44'/111111'/0'/0/0 (Standard Kaspa)
        const path = xprv.derivePath("m/44'/111111'/0'/0/0");

        // 4. Get Extended Public Key
        const xpub = path.toXPub();

        // 5. Generate Address
        const address = xpub.toAddress(network);

        console.log('🎉 Kaspa Wallet Generated!');
        console.log('📍 Address:', address.toString());
        console.log('🔑 Mnemonic:', mnemonicString);

        return {
            mnemonic: mnemonicString,
            address: address.toString(),
            publicKey: xpub.toString(),
            seed: seed,
        };
    } catch (error: any) {
        console.error('Kaspa wallet generation error:', error);
        throw new Error(`Failed to generate Kaspa wallet: ${error.message}`);
    }
}

/**
 * Restore a Kaspa wallet from mnemonic
 */
export async function restoreKaspaWallet(
    mnemonicString: string,
    network: 'mainnet' | 'testnet-10' | 'testnet-11' = 'testnet-10'
): Promise<KaspaWallet> {
    try {
        const Kaspa = await loadKaspa();

        // 1. Recover Seed
        const mnemonic = new Kaspa.Mnemonic(mnemonicString);
        const seed = Kaspa.Mnemonic.toSeed(mnemonic);

        // 2. Recover Keys
        const xprv = new Kaspa.XPrv(seed);
        const path = xprv.derivePath("m/44'/111111'/0'/0/0");

        // 3. Recover Public Data
        const xpub = path.toXPub();
        const address = xpub.toAddress(network);

        return {
            mnemonic: mnemonicString,
            address: address.toString(),
            publicKey: xpub.toString(),
        };
    } catch (error: any) {
        throw new Error(`Failed to restore Kaspa wallet: ${error.message}`);
    }
}

export async function initKaspa(): Promise<void> {
    await loadKaspa();
}
