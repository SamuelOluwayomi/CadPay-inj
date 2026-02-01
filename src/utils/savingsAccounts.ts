import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, TransactionInstruction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { CADPAY_MINT } from './cadpayToken';

const PROGRAM_ID = new PublicKey("6VvJbGzNHbtZLWxmLTYPpRz2F3oMDxdL1YRgV3b51Ccz");

/**
 * Calculate rent required for a SavingsPot account
 * SavingsPot structure: 8 (discriminator) + 32 (authority) + 32 (name pointer) + 8 (unlock_time) + 8 (balance) + 8 (created_at) + 1 (bump)
 */
export function calculateSavingsPotRent(connection: Connection): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
        8 + 32 + 32 + 8 + 8 + 8 + 1
    );
}

/**
 * Derive the PDA for a savings pot
 */
export function deriveSavingsPotPDA(
    userPublicKey: PublicKey,
    potName: string
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("savings-pot-v1"),
            userPublicKey.toBuffer(),
            Buffer.from(potName),
        ],
        PROGRAM_ID
    );
}

/**
 * Create instructions for creating a savings pot with storage rent funding (Paymaster-style)
 * @param userPublicKey - The user's smart wallet address
 * @param potName - Name of the pot
 * @param unlockTime - Unix timestamp when the pot can be withdrawn
 * @param connection - Solana connection
 * @returns Array of instructions to create the pot
 */
export async function createSavingsPotInstructions(
    userPublicKey: PublicKey,
    potName: string,
    unlockTime: number,
    connection: Connection
): Promise<TransactionInstruction[]> {
    const [savingsPotPDA, bump] = deriveSavingsPotPDA(userPublicKey, potName);

    // Calculate rent requirement
    const rentLamports = await connection.getMinimumBalanceForRentExemption(
        8 + 32 + 32 + 8 + 8 + 8 + 1
    );

    const instructions: TransactionInstruction[] = [];

    // 1. Fund the storage account with rent (Paymaster-style: upfront rent payment)
    instructions.push(
        SystemProgram.transfer({
            fromPubkey: userPublicKey,
            toPubkey: savingsPotPDA,
            lamports: rentLamports,
        })
    );

    // 2. Create the actual savings pot account via program instruction
    // Note: This assumes the program instruction is being called separately
    // or that we have access to signAndSendTransaction from Lazorkit

    return instructions;
}

/**
 * Deposit to a savings pot (USDC)
 * @param userPublicKey - The user's smart wallet address
 * @param potName - Name of the pot
 * @param amount - Amount in USDC to deposit
 * @param connection - Solana connection
 * @returns Transaction instruction for deposit
 */
export async function depositToPotInstruction(
    userPublicKey: PublicKey,
    potName: string,
    amount: number,
    connection: Connection
): Promise<TransactionInstruction> {
    const [savingsPotPDA] = deriveSavingsPotPDA(userPublicKey, potName);

    // Derive User ATA and Pot ATA
    const userATA = await getAssociatedTokenAddress(CADPAY_MINT, userPublicKey, true);
    const potATA = await getAssociatedTokenAddress(CADPAY_MINT, savingsPotPDA, true);

    // This returns a standard SPL transfer instruction
    // Note: The caller should ensure potATA is initialized if needed
    return createTransferInstruction(
        userATA,
        potATA,
        userPublicKey,
        BigInt(amount * 1_000_000), // 6 decimals for USDC
        [],
        TOKEN_PROGRAM_ID
    );
}

/**
 * Construct a transaction for creating a savings pot
 * Similar to constructMintTransaction pattern, this funds storage rent upfront
 */
export async function constructCreateSavingsPotTransaction(
    userPublicKey: string,
    potName: string,
    unlockTime: number,
    connection: Connection
): Promise<{
    instructions: TransactionInstruction[];
    savingsPotAddress: string;
}> {
    const userPubKey = new PublicKey(userPublicKey);
    const [savingsPotPDA] = deriveSavingsPotPDA(userPubKey, potName);

    // Calculate rent requirement for the savings pot account
    const rentLamports = await connection.getMinimumBalanceForRentExemption(
        8 + 32 + 32 + 8 + 8 + 8 + 1
    );

    const instructions: TransactionInstruction[] = [];

    // 1. Fund the PDA with rent (similar to how we fund storage for profiles)
    // This is the "Paymaster" pattern - user pre-funds the account
    instructions.push(
        SystemProgram.transfer({
            fromPubkey: userPubKey,
            toPubkey: savingsPotPDA,
            lamports: rentLamports,
        })
    );

    // 2. Create account instruction (if needed for initial setup)
    // The anchor program's init constraint will handle account creation

    return {
        instructions,
        savingsPotAddress: savingsPotPDA.toBase58(),
    };
}

/**
 * Get all savings pots for a user with USDC balances
 * @param userPublicKey - The user's smart wallet address
 * @param connection - Solana connection
 * @param potNames - Array of pot names to fetch
 * @returns Array of pot data with USDC balances
 */
export async function fetchUserSavingsPots(
    userPublicKey: PublicKey,
    connection: Connection,
    potNames: string[]
): Promise<Array<{
    name: string;
    address: string;
    balance: number;
}>> {
    const pots = await Promise.all(
        potNames.map(async (potName) => {
            const [potPDA] = deriveSavingsPotPDA(userPublicKey, potName);
            try {
                // Find the USDC ATA for this PDA
                const potATA = await getAssociatedTokenAddress(
                    CADPAY_MINT,
                    potPDA,
                    true
                );

                try {
                    const balanceResponse = await connection.getTokenAccountBalance(potATA);
                    return {
                        name: potName,
                        address: potPDA.toBase58(),
                        balance: balanceResponse.value.uiAmount || 0,
                    };
                } catch (e) {
                    // Pot exists but ATA might not yet
                    return {
                        name: potName,
                        address: potPDA.toBase58(),
                        balance: 0,
                    };
                }
            } catch (e) {
                return null;
            }
        })
    );

    return pots.filter((p) => p !== null) as Array<{
        name: string;
        address: string;
        balance: number;
    }>;
}
