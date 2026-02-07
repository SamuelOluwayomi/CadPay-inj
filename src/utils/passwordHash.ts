/**
 * Password hashing utilities using Web Crypto API
 * Implements PBKDF2 with SHA-256 for secure password hashing
 */

const ITERATIONS = 100000; // PBKDF2 iterations
const HASH_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16; // 128 bits

/**
 * Generate a random salt
 */
function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Convert hex string to ArrayBuffer
 */
function hexToBuffer(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

/**
 * Hash a password with a given salt
 */
async function hashPasswordWithSalt(password: string, salt: Uint8Array): Promise<string> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    // Derive key using PBKDF2
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt.buffer as ArrayBuffer,
            iterations: ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        HASH_LENGTH * 8
    );

    return bufferToHex(derivedBits);
}

/**
 * Hash a password (generates new salt)
 * Returns: "salt:hash" format
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = generateSalt();
    const hash = await hashPasswordWithSalt(password, salt);
    const saltHex = bufferToHex(salt.buffer as ArrayBuffer);
    return `${saltHex}:${hash}`;
}

/**
 * Verify a password against a stored hash
 * @param password - The password to verify
 * @param storedHash - The stored hash in "salt:hash" format
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
        const [saltHex, expectedHash] = storedHash.split(':');
        if (!saltHex || !expectedHash) {
            return false;
        }

        const salt = hexToBuffer(saltHex);
        const hash = await hashPasswordWithSalt(password, salt);

        // Constant-time comparison to prevent timing attacks
        return hash === expectedHash;
    } catch (error) {
        console.error('Password verification error:', error);
        return false;
    }
}
