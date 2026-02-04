/**
 * Password-based encryption utilities using PBKDF2
 * Provides fallback when biometrics are not available or desired
 */

import type { EncryptedSeed } from "./seedEncryption";

/**
 * Derive an encryption key from a password using PBKDF2
 * @param password - User password
 * @param salt - Salt for key derivation (should be stored with encrypted data)
 * @returns CryptoKey for AES-GCM encryption
 */
export async function deriveKeyFromPassword(
    password: string,
    salt: Uint8Array
): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as unknown as BufferSource,
            iterations: 100000, // High iteration count for security
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypt a seed phrase with a password
 * @param seedPhrase - Mnemonic to encrypt
 * @param password - User password
 * @returns Encrypted seed data with salt
 */
export async function encryptWithPassword(
    seedPhrase: string,
    password: string
): Promise<EncryptedSeed & { salt: Uint8Array }> {
    // Generate random salt
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Derive key from password
    const cryptoKey = await deriveKeyFromPassword(password, salt);

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encodedSeed = new TextEncoder().encode(seedPhrase);
    const ciphertext = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv as unknown as BufferSource,
        },
        cryptoKey,
        encodedSeed as unknown as BufferSource
    );

    return {
        ciphertext,
        iv,
        salt,
        timestamp: Date.now(),
    };
}

/**
 * Decrypt a seed phrase with a password
 * @param encryptedData - Encrypted seed data with salt
 * @param password - User password
 * @returns Decrypted seed phrase
 */
export async function decryptWithPassword(
    encryptedData: EncryptedSeed & { salt: Uint8Array },
    password: string
): Promise<string> {
    // Derive key from password using stored salt
    const cryptoKey = await deriveKeyFromPassword(password, encryptedData.salt);

    try {
        // Decrypt
        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: encryptedData.iv as unknown as BufferSource,
            },
            cryptoKey,
            encryptedData.ciphertext as unknown as BufferSource
        );

        return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
        throw new Error("Incorrect password or corrupted data");
    }
}

/**
 * Serialize password-encrypted seed for storage
 */
export function serializePasswordEncryptedSeed(
    encryptedSeed: EncryptedSeed & { salt: Uint8Array }
): Record<string, any> {
    return {
        ciphertext: btoa(
            String.fromCharCode(...new Uint8Array(encryptedSeed.ciphertext))
        ),
        iv: btoa(String.fromCharCode(...encryptedSeed.iv)),
        salt: btoa(String.fromCharCode(...encryptedSeed.salt)),
        timestamp: encryptedSeed.timestamp,
    };
}

/**
 * Deserialize password-encrypted seed from storage
 */
export function deserializePasswordEncryptedSeed(
    data: Record<string, any>
): EncryptedSeed & { salt: Uint8Array } {
    return {
        ciphertext: Uint8Array.from(atob(data.ciphertext), (c) =>
            c.charCodeAt(0)
        ).buffer,
        iv: Uint8Array.from(atob(data.iv), (c) => c.charCodeAt(0)),
        salt: Uint8Array.from(atob(data.salt), (c) => c.charCodeAt(0)),
        timestamp: data.timestamp,
    };
}
