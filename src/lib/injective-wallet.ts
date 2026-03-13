import { 
  PrivateKey, 
  MsgSend,
  TxGrpcApi,
  createTransaction,
  ChainRestBankApi,
  ChainRestAuthApi,
  TxRaw
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
    return { mnemonic: "random-mnemonic-not-recoverable-fix-with-bip39", address };
}

export async function transferInj(params: {
    mnemonic: string;
    recipient: string;
    amount: number; // in INJ
}): Promise<string> {
    const { mnemonic, recipient, amount } = params;
    
    try {
        const result = PrivateKey.fromMnemonic(mnemonic);
        // @ts-ignore
        const privateKey = result.privateKey || result;
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

        // 2. Initialize Clients
        const chainRestAuthApi = new ChainRestAuthApi(INJECTIVE_ENDPOINTS.rest);
        const txGrpcApi = new TxGrpcApi(INJECTIVE_ENDPOINTS.grpc);

        // 3. Get Account Details
        const accountDetails = await chainRestAuthApi.fetchAccount(injectiveAddress);
        const account = accountDetails.account as any;
        
        // Handle different account structures
        const sequence = account.base_account ? account.base_account.sequence : (account.sequence || 0);
        const accountNumber = account.base_account ? account.base_account.account_number : (account.account_number || 0);

        // 4. Create Transaction
        const { signDoc } = createTransaction({
            pubKey: privateKey.toPublicKey().toBase64(),
            chainId: INJECTIVE_CHAIN_ID,
            fee: {
                amount: [{
                    amount: '500000000000000', // 0.0005 INJ
                    denom: 'uinj'
                }],
                gas: '200000'
            },
            message: msg,
            sequence: parseInt(sequence.toString(), 10),
            accountNumber: parseInt(accountNumber.toString(), 10),
        });

        // 5. Sign Transaction
        // @ts-ignore
        const sig = await privateKey.sign(Buffer.from(signDoc.toBinary ? signDoc.toBinary() : signDoc.serializeBinary()));
        
        // 6. Broadcast Transaction
        // @ts-ignore
        const txRaw = (TxRaw.fromPartial || TxRaw.fromJSON)({
            bodyBytes: signDoc.bodyBytes,
            authInfoBytes: signDoc.authInfoBytes,
            signatures: [sig],
        });
        
        const response = await txGrpcApi.broadcast(txRaw);
        
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
