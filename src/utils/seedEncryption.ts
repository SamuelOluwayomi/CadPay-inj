/**
 * Seed phrase encryption utilities using AES-GCM
 * Encrypts/decrypts Kaspa seed phrases with biometric-derived keys
 */

export interface EncryptedSeed {
    ciphertext: ArrayBuffer;
    iv: Uint8Array;
    timestamp: number;
}

/**
 * Encrypt a seed phrase using AES-GCM
 * @param seedPhrase - The mnemonic seed phrase to encrypt
 * @param biometricKey - 32-byte encryption key from biometric authentication
 * @returns Encrypted seed data with IV
 */
export async function encryptSeed(
    seedPhrase: string,
    biometricKey: ArrayBuffer
): Promise<EncryptedSeed> {
    // Generate a random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Import the biometric key for AES-GCM encryption
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        biometricKey,
        "AES-GCM",
        false,
        ["encrypt"]
    );

    // Encode the seed phrase as bytes
    const encodedSeed = new TextEncoder().encode(seedPhrase);

    // Encrypt the seed
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
        timestamp: Date.now(),
    };
}

/**
 * Decrypt an encrypted seed phrase
 * @param encryptedData - The encrypted seed data
 * @param biometricKey - 32-byte decryption key from biometric authentication
 * @returns Decrypted seed phrase
 */
export async function decryptSeed(
    encryptedData: EncryptedSeed,
    biometricKey: ArrayBuffer
): Promise<string> {
    // Import the biometric key for AES-GCM decryption
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        biometricKey,
        "AES-GCM",
        false,
        ["decrypt"]
    );

    try {
        // Decrypt the ciphertext
        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: encryptedData.iv as unknown as BufferSource,
            },
            cryptoKey,
            encryptedData.ciphertext as unknown as BufferSource
        );

        // Decode the bytes back to a string
        const seedPhrase = new TextDecoder().decode(decryptedBuffer);
        return seedPhrase;
    } catch (error) {
        throw new Error(
            "Failed to decrypt seed phrase. The encryption key may be incorrect."
        );
    }
}

/**
 * Serialize encrypted seed for storage
 * @param encryptedSeed - Encrypted seed data
 * @returns JSON-serializable object
 */
export function serializeEncryptedSeed(
    encryptedSeed: EncryptedSeed
): Record<string, any> {
    return {
        ciphertext: btoa(
            String.fromCharCode(...new Uint8Array(encryptedSeed.ciphertext))
        ),
        iv: btoa(String.fromCharCode(...encryptedSeed.iv)),
        timestamp: encryptedSeed.timestamp,
    };
}

/**
 * Deserialize encrypted seed from storage
 * @param data - Serialized encrypted seed
 * @returns EncryptedSeed object
 */
export function deserializeEncryptedSeed(
    data: Record<string, any>
): EncryptedSeed {
    return {
        ciphertext: Uint8Array.from(atob(data.ciphertext), (c) =>
            c.charCodeAt(0)
        ).buffer,
        iv: Uint8Array.from(atob(data.iv), (c) => c.charCodeAt(0)),
        timestamp: data.timestamp,
    };
}
