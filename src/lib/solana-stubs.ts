/**
 * Placeholder stubs for Solana packages during Kaspa migration
 * TODO: Replace with actual Kaspa SDK when implementing blockchain logic
 */

// Mock @solana/web3.js exports
export class PublicKey {
    constructor(public value: string | Buffer | Uint8Array | number[]) { }
    toString(): string { return String(this.value); }
    toBase58(): string { return String(this.value); }
    toBuffer(): Buffer { return Buffer.from(String(this.value)); }
    equals(other: PublicKey): boolean { return this.value === other.value; }
    static isOnCurve(): boolean { return true; }
}

export class Connection {
    constructor(public endpoint: string, public commitment?: string) { }
    async getBalance(): Promise<number> { return 0; }
    async getAccountInfo(): Promise<any> { return null; }
    async sendTransaction(): Promise<string> { return ''; }
    async confirmTransaction(): Promise<any> { return {}; }
    async getRecentBlockhash(): Promise<any> { return { blockhash: '', feeCalculator: { lamportsPerSignature: 5000 } }; }
}

export class Transaction {
    signatures: any[] = [];
    instructions: any[] = [];
    recentBlockhash?: string;
    feePayer?: PublicKey;

    add(...items: any[]): Transaction { return this; }
    sign(...signers: any[]): void { }
    serialize(): Buffer { return Buffer.from(''); }
}

export class TransactionInstruction {
    constructor(public opts: { keys: any[], programId: PublicKey, data?: Buffer }) { }
}

export class Keypair {
    publicKey = new PublicKey('');
    secretKey = new Uint8Array();
    static generate(): Keypair { return new Keypair(); }
    static fromSecretKey(secretKey: Uint8Array): Keypair { return new Keypair(); }
}

export const SystemProgram = {
    programId: new PublicKey('11111111111111111111111111111111'),
    transfer: () => new TransactionInstruction({ keys: [], programId: new PublicKey('') }),
};

export const LAMPORTS_PER_SOL = 1000000000;

// Mock @solana/spl-token exports
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

export async function getAssociatedTokenAddress(): Promise<PublicKey> {
    return new PublicKey('');
}

export function createTransferInstruction(): TransactionInstruction {
    return new TransactionInstruction({ keys: [], programId: TOKEN_PROGRAM_ID });
}

export function createAssociatedTokenAccountInstruction(): TransactionInstruction {
    return new TransactionInstruction({ keys: [], programId: ASSOCIATED_TOKEN_PROGRAM_ID });
}

// Mock @solana/spl-memo exports
export function createMemoInstruction(memo: string, signerPubkey: PublicKey): TransactionInstruction {
    return new TransactionInstruction({ keys: [], programId: new PublicKey('') });
}

// Re-export for convenience
export type { PublicKey as PublicKeyType };
