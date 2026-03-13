import { Mnemonic, PrivateKey } from '@injectivelabs/sdk-ts';

/**
 * Generate a new Injective wallet (mnemonic and address)
 */
export async function generateInjectiveWallet() {
    const mnemonic = Mnemonic.generate();
    const privateKey = PrivateKey.fromMnemonic(mnemonic);
    const address = privateKey.toBech32();

    return {
        mnemonic,
        address
    };
}

/**
 * Restore an Injective wallet from a mnemonic
 */
export async function restoreInjectiveWallet(mnemonic: string) {
    const privateKey = PrivateKey.fromMnemonic(mnemonic);
    const address = privateKey.toBech32();

    return {
        mnemonic,
        address
    };
}
