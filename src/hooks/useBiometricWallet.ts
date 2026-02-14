/**
 * React hook for biometric wallet management
 * Combines biometric auth, encryption, and storage utilities
 * Supports both biometric and password-based encryption
 */

import { useState } from "react";
import {
    checkBiometricSupport,
    createPasskeyEncryptionKey,
    authenticateAndGetKey,
} from "@/utils/biometricAuth";
import { encryptSeed, decryptSeed } from "@/utils/seedEncryption";
import { storeSeed, retrieveSeed, walletExists, deleteSeed } from "@/utils/seedStorage";
import {
    encryptWithPassword,
    decryptWithPassword,
    serializePasswordEncryptedSeed,
    deserializePasswordEncryptedSeed,
} from "@/utils/passwordEncryption";
import { set, get, del } from "idb-keyval";

export function useBiometricWallet() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Check if biometric authentication is supported
     */
    const checkSupport = async () => {
        const support = await checkBiometricSupport();
        if (!support.supported) {
            setError(support.reason || "Biometric authentication not supported");
        }
        return support;
    };

    /**
     * Check if a biometric wallet exists for the given username
     */
    const hasBiometricWallet = async (username: string): Promise<boolean> => {
        try {
            const exists = await walletExists(username);
            return exists;
        } catch {
            return false;
        }
    };

    /**
     * Create a new wallet with biometric protection
     * @param username - User identifier
     * @param seedPhrase - Kaspa seed phrase to protect
     */
    const createWallet = async (username: string, seedPhrase: string) => {
        setIsLoading(true);
        setError(null);

        try {
            // Check if wallet already exists
            const exists = await walletExists(username);
            if (exists) {
                throw new Error("A wallet already exists for this username");
            }

            // Create passkey and get encryption key
            const { encryptionKey, credentialId } =
                await createPasskeyEncryptionKey(username);

            // Encrypt the seed phrase
            const encryptedSeed = await encryptSeed(seedPhrase, encryptionKey);

            // Store in IndexedDB
            await storeSeed(username, encryptedSeed, credentialId);

            return { success: true };
        } catch (err: any) {
            const errorMessage = err.message || "Failed to create wallet";
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Create a new wallet with password protection
     * @param username - User identifier
     * @param seedPhrase - Kaspa seed phrase to protect
     * @param password - User password
     */
    const createWalletWithPassword = async (
        username: string,
        seedPhrase: string,
        password: string
    ) => {
        setIsLoading(true);
        setError(null);

        try {
            // Check if wallet already exists
            const exists = await walletExists(username);
            if (exists) {
                throw new Error("A wallet already exists for this username");
            }

            // Encrypt with password
            const encryptedData = await encryptWithPassword(seedPhrase, password);

            // Serialize and store
            const serialized = serializePasswordEncryptedSeed(encryptedData);
            await set(`wallet-password:${username}`, {
                username,
                encryptedSeed: serialized,
                authType: "password",
                createdAt: Date.now(),
                lastAccessedAt: Date.now(),
            });

            return { success: true };
        } catch (err: any) {
            const errorMessage = err.message || "Failed to create wallet";
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Unlock wallet and retrieve seed phrase (biometric)
     * @param username - User identifier
     * @returns Decrypted seed phrase
     */
    const unlockWallet = async (username: string): Promise<{ success: boolean; mnemonic?: string; error?: string }> => {
        setIsLoading(true);
        setError(null);

        try {
            // Retrieve encrypted seed and credential ID
            const walletData = await retrieveSeed(username);
            if (!walletData) {
                throw new Error("No wallet found for this username");
            }

            // Authenticate and get decryption key
            const decryptionKey = await authenticateAndGetKey(
                walletData.credentialId
            );

            // Decrypt the seed phrase
            const seedPhrase = await decryptSeed(
                walletData.encryptedSeed,
                decryptionKey
            );

            return { success: true, mnemonic: seedPhrase };
        } catch (err: any) {
            const errorMessage = err.message || "Failed to unlock wallet";
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Unlock wallet with password
     * @param username - User identifier
     * @param password - User password
     * @returns Decrypted seed phrase
     */
    const unlockWalletWithPassword = async (
        username: string,
        password: string
    ): Promise<{ success: boolean; mnemonic?: string; error?: string }> => {
        setIsLoading(true);
        setError(null);

        try {
            const walletData = await get(`wallet-password:${username}`);
            if (!walletData) {
                throw new Error("No wallet found for this username");
            }

            // Deserialize and decrypt
            const encryptedData = deserializePasswordEncryptedSeed(
                walletData.encryptedSeed
            );
            const seedPhrase = await decryptWithPassword(encryptedData, password);

            return { success: true, mnemonic: seedPhrase };
        } catch (err: any) {
            const errorMessage =
                err.message === "Incorrect password or corrupted data"
                    ? "Incorrect password"
                    : "Failed to unlock wallet";
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Check if a wallet exists for a username (either type)
     */
    const checkWalletExists = async (username: string) => {
        const biometric = await walletExists(username);
        const password = (await get(`wallet-password:${username}`)) !== undefined;
        return biometric || password;
    };

    /**
     * Delete existing wallet (local data only)
     */
    const deleteWallet = async (username: string) => {
        setIsLoading(true);
        try {
            await deleteSeed(username);
            await del(`wallet-password:${username}`);
            return { success: true };
        } catch (err: any) {
            setError(err.message || "Failed to delete wallet");
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        error,
        checkSupport,
        hasBiometricWallet,
        createWallet,
        createWalletWithPassword,
        unlockWallet,
        unlockWalletWithPassword,
        checkWalletExists,
        deleteWallet,
    };
}
