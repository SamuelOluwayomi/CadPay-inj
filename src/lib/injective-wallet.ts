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
    mnemonic: string;
    recipient: string;
    amount: number; // in INJ
}): Promise<string> {
    const { mnemonic, recipient, amount } = params;
    
    try {
        const privateKey = PrivateKey.fromMnemonic(mnemonic);
        const injectiveAddress = privateKey.toBech32();
        
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
            privateKey: privateKey.toHex()
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
