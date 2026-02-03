/**
 * Placeholder stubs for Solana packages during Kaspa migration
 * TODO: Replace with actual Kaspa SDK when implementing blockchain logic
 */

// Mock @solana/web3.js exports
export class PublicKey {
    constructor(public value: string | Buffer | Uint8Array | number[]) { }
    toString(): string { return String(this.value); }
    toBase58(): string { return String(this.value); }
    toBuffer(): Buffer {
        if (this.value instanceof Buffer) return this.value;
        if (typeof this.value === 'string') return Buffer.from(this.value);
        return Buffer.from([]);
    }
    equals(other: PublicKey): boolean { return String(this.value) === String(other.value); }
    static isOnCurve(): boolean { return true; }
    static findProgramAddressSync(seeds: any[], programId: PublicKey): [PublicKey, number] {
        return [new PublicKey('pda'), 0];
    }
}

export class Connection {
    constructor(public endpoint?: string, public commitment?: string) { }
    async getBalance(pubkey: PublicKey): Promise<number> { return 0; }
    async getAccountInfo(pubkey: PublicKey): Promise<any> { return null; }
    async getVersion(): Promise<any> { return { 'solana-core': '1.0.0' }; }
    async sendTransaction(tx: any, signers: any[] = []): Promise<string> { return ''; }
    async sendRawTransaction(data: any): Promise<string> { return ''; }
    async confirmTransaction(...args: any[]): Promise<any> { return {}; }
    async getRecentBlockhash(): Promise<any> { return { blockhash: '', feeCalculator: { lamportsPerSignature: 5000 } }; }
    async getLatestBlockhash(...args: any[]): Promise<any> { return { blockhash: '', lastValidBlockHeight: 0 }; }
    async getMinimumBalanceForRentExemption(size: number): Promise<number> { return 0; }
    async getTokenAccountBalance(ata: PublicKey): Promise<any> { return { value: { uiAmount: 0 } }; }
    onAccountChange(ata: PublicKey, callback: (info: any) => void, commitment?: string): number { return 0; }
    removeAccountChangeListener(id: number): void { }
    async getSignaturesForAddress(address: PublicKey, options?: any): Promise<any[]> { return []; }
    async getParsedTransaction(signature: string, commitment?: string): Promise<any> { return null; }
    async getTransaction(signature: string, options?: any): Promise<any> { return null; }
    async requestAirdrop(publicKey: PublicKey, lamports: number): Promise<string> { return ''; }
    async getAddressLookupTable(address: PublicKey): Promise<any> { return { value: null }; }
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
    transfer: (args: any) => new TransactionInstruction({ keys: [], programId: new PublicKey('') }),
    createAccount: (args: any) => new TransactionInstruction({ keys: [], programId: new PublicKey('') }),
};

export const LAMPORTS_PER_SOL = 1000000000;

// Mock @solana/spl-token exports
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

export async function getAssociatedTokenAddress(...args: any[]): Promise<PublicKey> {
    return new PublicKey('ata');
}

export function createTransferInstruction(...args: any[]): TransactionInstruction {
    return new TransactionInstruction({ keys: [], programId: TOKEN_PROGRAM_ID });
}

export function createAssociatedTokenAccountInstruction(...args: any[]): TransactionInstruction {
    return new TransactionInstruction({ keys: [], programId: ASSOCIATED_TOKEN_PROGRAM_ID });
}

// Classes first
export class BN {
    constructor(public value: number | string | Buffer | Uint8Array) { }
    toNumber(): number { return Number(this.value); }
    toString(): string { return String(this.value); }
    toArray(): number[] { return []; }
    toBuffer(): Buffer { return Buffer.from([]); }
    add(other: BN): BN { return new BN(0); }
    sub(other: BN): BN { return new BN(0); }
    mul(other: BN): BN { return new BN(0); }
    div(other: BN): BN { return new BN(0); }
}

export class Program<T = any> {
    constructor(public idl: T, public provider: any) { }
    account: any = {};
    methods: any = {};
}

export class AnchorProvider {
    constructor(public connection: Connection, public wallet: any, public opts?: any) { }
    static getProvider(): AnchorProvider { return new AnchorProvider(new Connection(''), {}); }
}

// Mock @coral-xyz/anchor exports using the classes
export const anchor = {
    web3: {
        PublicKey,
        Connection,
        Transaction,
        SystemProgram,
        Keypair,
        LAMPORTS_PER_SOL,
        TransactionInstruction
    },
    BN,
    Program,
    AnchorProvider
};

export type Idl = any;

export const web3 = anchor.web3;

// Mock buffer if needed (Next.js/Turbopack usually handles it or errors if missing in client)
if (typeof window !== 'undefined' && !(window as any).Buffer) {
    (window as any).Buffer = Buffer;
}

// Mock @solana/spl-memo exports
export function createMemoInstruction(memo: string, signerPubkeys: PublicKey | PublicKey[]): TransactionInstruction {
    return new TransactionInstruction({ keys: [], programId: new PublicKey('') });
}

// Re-export for convenience
export type { PublicKey as PublicKeyType };

// Mock AccountLayout
export const AccountLayout = {
    decode: (data: Buffer) => ({}),
    encode: (data: any) => Buffer.from([]),
    span: 0
};

// Additional spl-token exports
export async function getTokenAccountBalance(connection: Connection, ata: PublicKey): Promise<{ value: { uiAmount: number } }> {
    return { value: { uiAmount: 0 } };
}
