import { 
  PrivateKey, 
  MsgSend,
  MsgBroadcasterWithPk
} from '@injectivelabs/sdk-ts';
import { Network, getNetworkEndpoints } from '@injectivelabs/networks';
import { BigNumberInBase } from '@injectivelabs/utils';


export const INJECTIVE_NETWORK = Network.Testnet;
export const INJECTIVE_ENDPOINTS = getNetworkEndpoints(INJECTIVE_NETWORK);
export const INJECTIVE_CHAIN_ID = 'injective-888'; // Injective Testnet

export function getAddressFromMnemonic(mnemonic: string): string {
    const result = PrivateKey.fromMnemonic(mnemonic);
    // @ts-ignore - Handle different return types from SDK versions
    const pk = result.privateKey || result;
    return pk.toBech32();
}

export function generateInjectiveWallet(): { mnemonic: string; address: string } {
    const result = PrivateKey.generate();
    // @ts-ignore
    const pk = result.privateKey || result;
    const address = pk.toBech32();
    return { mnemonic: "random-mnemonic-not-recoverable", address };
}

export async function transferInj(params: {
    mnemonicOrKey: string;
    recipient: string;
    amount: number; // in INJ
}): Promise<string> {
    const { mnemonicOrKey, recipient, amount } = params;
    // 0. Sanitization: Remove ALL quotes, whitespace, and newlines
    const ultraClean = mnemonicOrKey.replace(/['"\s\n\r]/g, '');
    
    try {
        let privateKey: PrivateKey;
        // If the original had spaces, it's likely a mnemonic (don't use ultraClean yet)
        if (mnemonicOrKey.trim().includes(' ')) {
            const cleanMnemonic = mnemonicOrKey.replace(/['"]/g, '').trim();
            privateKey = PrivateKey.fromMnemonic(cleanMnemonic);
        } else {
            // Hex key path: must be exactly 64 chars after removing 0x
            const cleanHex = ultraClean.replace(/^0x/, '');
            if (cleanHex.length !== 64) {
                throw new Error(`Invalid hex key length: ${cleanHex.length} characters (expected 64)`);
            }
            privateKey = PrivateKey.fromHex(cleanHex);
        }
        const injectiveAddress = privateKey.toBech32();
        console.log("🔥 MY REAL FAUCET ADDRESS:", injectiveAddress);
        
        // 1. Prepare the MsgSend
        const amountInBase = new BigNumberInBase(amount).toWei();
        const msg = MsgSend.fromJSON({
            amount: {
                denom: 'uinj',
                amount: amountInBase.toString()
            },
            srcInjectiveAddress: injectiveAddress,
            dstInjectiveAddress: recipient
        });

        // 2. Initialize Broadcaster with Private Key
        // This handles account fetching, sequence management, and signing in one step
        const broadcaster = new MsgBroadcasterWithPk({
            network: INJECTIVE_NETWORK,
            privateKey: privateKey
        });

        // 3. Broadcast Transaction
        const response = await broadcaster.broadcast({
            msgs: msg
        });
        
        if (response.code !== 0) {
            throw new Error(`Transaction failed with code ${response.code}: ${response.rawLog}`);
        }

        console.log(`Successfully transferred ${amount} INJ! Tx hash: ${response.txHash}`);
        return response.txHash;
    } catch (error: any) {
        console.error('Injective transfer error:', error);
        throw new Error(error.message || 'Failed to complete Injective transfer');
    }
}
