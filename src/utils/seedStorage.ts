/**
 * IndexedDB storage for encrypted seed phrases
 * Uses idb-keyval for simple key-value storage
 */

import { get, set, del, keys } from "idb-keyval";
import type { EncryptedSeed } from "./seedEncryption";
import {
    serializeEncryptedSeed,
    deserializeEncryptedSeed,
} from "./seedEncryption";

export interface StoredWalletData {
    username: string;
    encryptedSeed: Record<string, any>; // Serialized EncryptedSeed
    credentialId: string;
    createdAt: number;
    lastAccessedAt: number;
}

/**
 * Store encrypted seed in IndexedDB
 * @param username - User identifier
 * @param encryptedSeed - Encrypted seed data
 * @param credentialId - WebAuthn credential ID
 */
export async function storeSeed(
    username: string,
    encryptedSeed: EncryptedSeed,
    credentialId: string
): Promise<void> {
    const walletData: StoredWalletData = {
        username,
        encryptedSeed: serializeEncryptedSeed(encryptedSeed),
        credentialId,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
    };

    await set(`wallet:${username}`, walletData);
}

/**
 * Retrieve encrypted seed from IndexedDB
 * @param username - User identifier
 * @returns Wallet data including encrypted seed and credential ID
 */
export async function retrieveSeed(
    username: string
): Promise<{
    encryptedSeed: EncryptedSeed;
    credentialId: string;
} | null> {
    const walletData = await get<StoredWalletData>(`wallet:${username}`);

    if (!walletData) {
        return null;
    }

    // Update last accessed time
    walletData.lastAccessedAt = Date.now();
    await set(`wallet:${username}`, walletData);

    return {
        encryptedSeed: deserializeEncryptedSeed(walletData.encryptedSeed),
        credentialId: walletData.credentialId,
    };
}

/**
 * Delete encrypted seed from IndexedDB
 * @param username - User identifier
 */
export async function deleteSeed(username: string): Promise<void> {
    await del(`wallet:${username}`);
}

/**
 * Check if a wallet exists for a username
 * @param username - User identifier
 * @returns True if wallet exists
 */
export async function walletExists(username: string): Promise<boolean> {
    const walletData = await get<StoredWalletData>(`wallet:${username}`);
    return walletData !== undefined;
}

/**
 * List all stored wallet usernames
 * @returns Array of usernames
 */
export async function listWallets(): Promise<string[]> {
    const allKeys = await keys();
    return allKeys
        .filter((key) => typeof key === "string" && key.startsWith("wallet:"))
        .map((key) => (key as string).replace("wallet:", ""));
}
