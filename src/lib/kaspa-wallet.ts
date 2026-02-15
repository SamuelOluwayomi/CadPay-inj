/**
 * Client-side Kaspa wallet library
 * Handles WASM SDK initialization, transaction signing, and key management
 */

import { useBiometricWallet } from '@/hooks/useBiometricWallet';

// Lazy load the WASM SDK
let kaspaWasm: any = null;
let isInitialized = false;

/**
 * Initialize the Kaspa WASM SDK (browser only)
 * This must be called before any other wallet operations
 */
export async function initKaspaWasm(): Promise<void> {
    if (isInitialized) return;

    try {
        // Dynamic import of the WASM SDK
        const wasmModule = await import('@kluster/kaspa-wasm-web');

        // The default export is the init function
        if (typeof wasmModule.default === 'function') {
            await wasmModule.default();
        }

        // Store the module for later use
        kaspaWasm = wasmModule;

        isInitialized = true;
        console.log('✅ Kaspa WASM SDK initialized');
    } catch (error) {
        console.error('Failed to initialize Kaspa WASM SDK:', error);
        throw new Error('Failed to initialize wallet. Please refresh and try again.');
    }
}

/**
 * Get the initialized WASM SDK instance
 * Throws if not initialized
 */
function getKaspaWasm() {
    if (!isInitialized || !kaspaWasm) {
        throw new Error('Kaspa WASM not initialized. Call initKaspaWasm() first.');
    }
    return kaspaWasm;
}

/**
 * Derive a private key from seed phrase
 * @param seedPhrase - 12 or 24 word seed phrase
 * @returns Private key instance
 */
export function derivePrivateKeyFromSeed(seedPhrase: string): any {
    const kaspa = getKaspaWasm();

    try {
        // Create mnemonic from seed phrase
        const mnemonic = new kaspa.Mnemonic(seedPhrase);

        // Derive private key at standard path (m/44'/972/0'/0/0)
        // 1. Convert mnemonic to seed
        const seed = mnemonic.toSeed();

        // 2. Create XPrv from seed
        const xprv = new kaspa.XPrv(seed);

        // 3. Derive path (m/44'/111111'/0'/0/0)
        // Kaspa Coin Type is 111111
        const path = xprv.derivePath("m/44'/111111'/0'/0/0");

        // 4. Get Private Key
        const privateKey = path.toPrivateKey();

        // Debug: Check derived address
        try {
            const network = kaspa.NetworkType.Testnet;

            // Method 1: Via Private Key (Used for Signing)
            const pubKey1 = privateKey.toPublicKey();
            const addr1 = pubKey1.toAddress(network);
            console.log('🔍 Debug: Address via PrivateKey:', addr1.toString());

            // Method 2: Via XPub (Used in Generation)
            const xpub = path.toXPub();
            const pubKey2 = xpub.toPublicKey();
            const addr2 = pubKey2.toAddress(network);
            console.log('🔍 Debug: Address via XPub:', addr2.toString());

            if (addr1.toString() !== addr2.toString()) {
                console.error('⚠️ CRITICAL: Derivation Mismatch between PrivateKey and XPub methods!');
            }
        } catch (e) {
            console.log('🔍 Debug: Could not derive address for logging', e);
        }

        return privateKey;

        return privateKey;
    } catch (error) {
        console.error('Failed to derive private key:', error);
        throw new Error('Invalid seed phrase');
    }
}

/**
 * Get wallet address from private key
 * @param privateKey - Private key instance
 * @param networkType - 'mainnet' or 'testnet-10'
 * @returns Kaspa address string
 */
export function getAddressFromPrivateKey(privateKey: any, networkType: 'mainnet' | 'testnet-10' = 'testnet-10'): string {
    const kaspa = getKaspaWasm();

    try {
        const network = networkType === 'mainnet'
            ? kaspa.NetworkType.Mainnet
            : kaspa.NetworkType.Testnet;

        const address = privateKey.toPublicKey().toAddress(network);
        return address.toString();
    } catch (error) {
        console.error('Failed to derive address:', error);
        throw new Error('Failed to generate wallet address');
    }
}

/**
 * Build, sign, and broadcast a transaction directly to the Kaspa network
 * @param params - Transaction parameters
 * @returns Transaction ID from the network
 */
export async function signTransaction(params: {
    seedPhrase: string;
    recipient: string;
    amount: number; // in KAS
    networkType?: 'mainnet' | 'testnet-10';
}): Promise<string> {
    const kaspa = getKaspaWasm();
    const { seedPhrase, recipient, amount, networkType = 'testnet-10' } = params;

    try {
        // 1. Derive private key from seed
        const privateKey = derivePrivateKeyFromSeed(seedPhrase);
        const sourceAddress = getAddressFromPrivateKey(privateKey, networkType);

        console.log(`🔐 Signing transaction from: ${sourceAddress}`);
        console.log(`🎯 Sending to: ${recipient}`);
        console.log(`💰 Amount: ${amount} KAS`);

        // 2. Fetch UTXOs from API
        const apiUrl = networkType === 'mainnet'
            ? 'https://api.kaspa.org'
            : 'https://api-tn10.kaspa.org';

        const utxoRes = await fetch(`${apiUrl}/addresses/${sourceAddress}/utxos`);

        if (!utxoRes.ok) {
            throw new Error(`Failed to fetch UTXOs: ${utxoRes.statusText}`);
        }

        const utxoData = await utxoRes.json();

        if (!Array.isArray(utxoData) || utxoData.length === 0) {
            throw new Error('Insufficient funds (no UTXOs found)');
        }

        // 3. Convert API UTXOs to IUtxoEntry format
        const utxoEntries = utxoData.map((u: any) => ({
            address: sourceAddress,
            outpoint: {
                transactionId: u.outpoint.transactionId,
                index: u.outpoint.index
            },
            amount: BigInt(u.utxoEntry.amount),
            scriptPublicKey: new kaspa.ScriptPublicKey(
                u.utxoEntry.scriptPublicKey.version,
                u.utxoEntry.scriptPublicKey.scriptPublicKey
            ),
            blockDaaScore: BigInt(u.utxoEntry.blockDaaScore),
            isCoinbase: u.utxoEntry.isCoinbase || false
        }));

        console.log(`⚙️ Building transaction with ${utxoEntries.length} UTXOs...`);

        // 4. Build transaction using Generator
        const amountSompi = BigInt(Math.floor(amount * 100000000));

        const generator = new kaspa.Generator({
            entries: utxoEntries,
            outputs: [{
                address: recipient,
                amount: amountSompi
            }],
            changeAddress: sourceAddress,
            priorityFee: 0n,
            networkId: networkType === 'mainnet' ? 'mainnet' : 'testnet-10'
        });

        // 5. Generate and sign transaction
        const pendingTx = await generator.next();

        if (!pendingTx) {
            throw new Error('Failed to generate transaction');
        }

        // Sign with private key hex string (confirmed working approach)
        const privateKeyHex = privateKey.toString();
        await pendingTx.sign([privateKeyHex]);

        console.log('✅ Transaction signed successfully');

        // 6. Extract signed transaction and serialize for Kaspa REST API
        const tx = pendingTx.transaction;

        const txPayload = {
            transaction: {
                version: tx.version,
                inputs: tx.inputs.map((input: any) => ({
                    previousOutpoint: {
                        transactionId: input.previousOutpoint.transactionId,
                        index: input.previousOutpoint.index
                    },
                    signatureScript: input.signatureScript || '',
                    sequence: Number(input.sequence),
                    sigOpCount: input.sigOpCount
                })),
                outputs: tx.outputs.map((output: any) => ({
                    amount: Number(output.value ?? output.amount),
                    scriptPublicKey: {
                        version: typeof output.scriptPublicKey === 'object'
                            ? (output.scriptPublicKey.version ?? 0)
                            : 0,
                        scriptPublicKey: typeof output.scriptPublicKey === 'object'
                            ? (output.scriptPublicKey.script ?? output.scriptPublicKey.scriptPublicKey ?? '')
                            : String(output.scriptPublicKey)
                    }
                })),
                lockTime: Number(tx.lockTime ?? 0),
                subnetworkId: tx.subnetworkId || '0000000000000000000000000000000000000000'
            }
        };

        console.log('📡 Broadcasting transaction to Kaspa network...');

        // 7. Broadcast directly to Kaspa REST API
        const broadcastRes = await fetch(`${apiUrl}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(txPayload)
        });

        if (!broadcastRes.ok) {
            const errorText = await broadcastRes.text();
            console.error('❌ Broadcast failed:', errorText);
            throw new Error(`Broadcast failed: ${errorText}`);
        }

        const result = await broadcastRes.json();
        const txId = result.transactionId;

        console.log(`🚀 Transaction broadcast successful! TxID: ${txId}`);

        return txId;
    } catch (error: any) {
        console.error('Transaction signing failed:', error);
        throw new Error(error.message || 'Failed to sign transaction');
    }
}

/**
 * Unlock wallet and sign transaction with password
 * @param params - Transaction and authentication parameters
 * @returns Signed transaction JSON string
 */
export async function unlockAndSignTransaction(params: {
    username: string;
    password: string;
    recipient: string;
    amount: number;
    networkType?: 'mainnet' | 'testnet-10';
}): Promise<string> {
    const { unlockWalletWithPassword } = useBiometricWallet();

    // Unlock wallet with password
    const result = await unlockWalletWithPassword(params.username, params.password);

    if (!result.success || !result.mnemonic) {
        throw new Error(result.error || 'Failed to unlock wallet');
    }

    // Sign transaction with unlocked seed phrase
    return signTransaction({
        seedPhrase: result.mnemonic,
        recipient: params.recipient,
        amount: params.amount,
        networkType: params.networkType,
    });
}


/**
 * Create a new wallet in browser storage
 * @param params - Wallet creation parameters  
 * @returns Success status
 */
export async function createWallet(params: {
    username: string;
    seedPhrase: string;
    password: string;
}): Promise<{ success: boolean; address?: string; error?: string }> {
    const { createWalletWithPassword } = useBiometricWallet();

    try {
        // Initialize WASM if needed
        await initKaspaWasm();

        // Verify seed phrase is valid by deriving address
        const privateKey = derivePrivateKeyFromSeed(params.seedPhrase);
        const address = getAddressFromPrivateKey(privateKey, 'testnet-10');

        // Store encrypted seed in IndexedDB
        const result = await createWalletWithPassword(
            params.username,
            params.seedPhrase,
            params.password
        );

        if (!result.success) {
            return { success: false, error: result.error };
        }

        return { success: true, address };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to create wallet' };
    }
}

/**
 * Get wallet address without unlocking
 * (Derives from unlocked seed phrase)
 */
export function getWalletAddress(seedPhrase: string, networkType: 'mainnet' | 'testnet-10' = 'testnet-10'): string {
    const privateKey = derivePrivateKeyFromSeed(seedPhrase);
    return getAddressFromPrivateKey(privateKey, networkType);
}
