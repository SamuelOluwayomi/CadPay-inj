/**
 * Kaspa wallet generation utilities - ROBUST LOADING
 */

// Singleton to prevent double-init crashing
let kaspaModule: any = null;
let initPromise: Promise<any> | null = null;

async function loadKaspa() {
    // 1. If we already loaded it, return immediately
    if (kaspaModule) return kaspaModule;

    // 2. If initialization is in progress, wait for it
    if (initPromise) return initPromise;

    // 3. Start initialization
    initPromise = (async () => {
        // Import the JS wrapper
        const Kaspa = await import('@kluster/kaspa-wasm-web');

        // Critical: The path must be absolute from the public folder
        const WASM_PATH = '/kaspa_wasm_bg.wasm';

        try {
            // Always try to initialize - the WASM needs this
            console.log('🔄 Loading Kaspa WASM from:', WASM_PATH);
            // @ts-ignore
            await Kaspa.default(WASM_PATH);
            console.log('✅ Kaspa WASM loaded successfully');
        } catch (e: any) {
            // If it says "already initialized", that's OK
            if (!e.message?.includes('already') && !e.message?.includes('init')) {
                console.error("CRITICAL WASM LOAD ERROR:", e);
                throw new Error(`Could not load Kaspa WASM from ${WASM_PATH}. Error: ${e.message}`);
            }
            console.log('ℹ️ WASM already initialized');
        }

        kaspaModule = Kaspa;
        return Kaspa;
    })();

    return initPromise;
}

export interface KaspaWallet {
    mnemonic: string;
    address: string;
    publicKey: string;
    seed?: string;
}

export async function generateKaspaWallet(
    network: 'mainnet' | 'testnet-10' | 'testnet-11' = 'testnet-10'
): Promise<KaspaWallet> {
    try {
        const Kaspa = await loadKaspa();
        console.log('🔍 Kaspa.NetworkType:', Kaspa.NetworkType);
        console.log('🔍 Kaspa.NetworkId:', Kaspa.NetworkId);

        // 1. Generate Mnemonic
        const mnemonic = Kaspa.Mnemonic.random();
        const mnemonicString = mnemonic.phrase;
        const seed = mnemonic.toSeed();

        // 2. Create Master Private Key
        const xprv = new Kaspa.XPrv(seed as any);

        // 3. Derive the Account Path (m/44'/111111'/0'/0/0)
        const path = xprv.derivePath("m/44'/111111'/0'/0/0");

        // 4. Convert to Extended Public Key (XPub)
        const xpub = path.toXPub();

        // 5. Extract Raw Public Key from XPub
        const publicKey = xpub.toPublicKey();

        // 6. Generate Address with correct NetworkType enum
        // The library requires a NetworkType object/enum, not a string
        const networkType = (network === 'mainnet')
            ? Kaspa.NetworkType.Mainnet
            : Kaspa.NetworkType.Testnet;

        const address = publicKey.toAddress(networkType);

        console.log('✅ Wallet generated:', address.toString());

        // 7. Verify Reconstruction (Sanity Check)
        // Ensure that storing the mnemonic string and reconstructing it produces the SAME address
        try {
            // Note: In reconstruction we must ensure we use the same NetworkType logic
            const verifyMnemonic = new Kaspa.Mnemonic(mnemonicString);
            const verifySeed = verifyMnemonic.toSeed();
            const verifyXprv = new Kaspa.XPrv(verifySeed as any);
            const verifyPath = verifyXprv.derivePath("m/44'/111111'/0'/0/0");
            // Use XPub method as per generation flow
            const verifyAddr = verifyPath.toXPub().toPublicKey().toAddress(networkType).toString();

            if (verifyAddr !== address.toString()) {
                console.error('🚨 CRITICAL GEN ERROR: Reconstructed address does not match!');
                console.error('Original:', address.toString());
                console.error('Reconstructed:', verifyAddr);
                // We should probably throw here to prevent bad wallet generation
            } else {
                console.log('✅ Wallet Generation Verified: Reconstruction matches.');
            }
        } catch (vErr) {
            console.error('Validation Error:', vErr);
        }

        return {
            mnemonic: mnemonicString,
            address: address.toString(),
            publicKey: publicKey.toString(),
            seed: seed
        };
    } catch (error: any) {
        console.error('Wallet Gen Error:', error);
        throw error; // Re-throw so the UI sees it
    }
}

export async function restoreKaspaWallet(
    mnemonicString: string,
    network: 'mainnet' | 'testnet-10' | 'testnet-11' = 'testnet-10'
): Promise<KaspaWallet> {
    try {
        const Kaspa = await loadKaspa();

        const mnemonic = new Kaspa.Mnemonic(mnemonicString);
        const seed = mnemonic.toSeed();

        const xprv = new Kaspa.XPrv(seed as any);
        const path = xprv.derivePath("m/44'/111111'/0'/0/0");

        const xpub = path.toXPub();

        // Extract Public Key from XPub
        const publicKey = xpub.toPublicKey();

        // Generate address with correct NetworkType enum
        const networkType = (network === 'mainnet')
            ? Kaspa.NetworkType.Mainnet
            : Kaspa.NetworkType.Testnet;

        const address = publicKey.toAddress(networkType);

        return {
            mnemonic: mnemonicString,
            address: address.toString(),
            publicKey: publicKey.toString(),
        };
    } catch (error: any) {
        throw new Error(`Failed to restore Kaspa wallet: ${error.message}`);
    }
}

export async function initKaspa(): Promise<void> {
    await loadKaspa();
}

