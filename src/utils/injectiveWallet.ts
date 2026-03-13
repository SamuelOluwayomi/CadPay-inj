import { PrivateKey } from '@injectivelabs/sdk-ts';
import { Wallet } from 'ethers';

/**
 * Generate a new Injective wallet (mnemonic and address)
 */
export async function generateInjectiveWallet() {
    const mnemonic = Wallet.createRandom().mnemonic?.phrase || "";
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
