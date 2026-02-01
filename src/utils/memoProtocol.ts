import { TransactionInstruction } from '@solana/web3.js';
import { createMemoInstruction } from '@solana/spl-memo';

/**
 * Create a memo instruction to demonstrate protocol integration
 * The SPL Memo program is a standard Solana protocol that attaches text notes to transactions
 * 
 * @param message - The memo message to attach
 * @param signerPubkey - The public key of the transaction signer
 * @returns TransactionInstruction that can be added to any transaction
 */
export function createSubscriptionMemoInstruction(
    message: string,
    signerPubkey: import('@solana/web3.js').PublicKey
): TransactionInstruction {
    return createMemoInstruction(message, [signerPubkey]);
}

/**
 * Example usage in a payment transaction:
 * 
 * const memoInstruction = createSubscriptionMemoInstruction(
 *     "CadPay Subscription Payment",
 *     senderPublicKey
 * );
 * 
 * transaction.add(memoInstruction);  // Add memo first
 * transaction.add(transferInstruction);  // Then the actual transfer
 */
