/**
 * WebAuthn-based biometric authentication utilities
 * Uses PRF (Pseudo-Random Function) extension to generate deterministic encryption keys
 */

export interface PasskeyCredential {
    credentialId: string;
    username: string;
}

/**
 * Check if the browser supports WebAuthn and biometric authentication
 */
export async function checkBiometricSupport(): Promise<{
    supported: boolean;
    reason?: string;
}> {
    // Check for basic WebAuthn support
    if (!window.PublicKeyCredential) {
        return {
            supported: false,
            reason: "WebAuthn is not supported in this browser",
        };
    }

    // Check for platform authenticator (biometric)
    try {
        const available =
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!available) {
            return {
                supported: false,
                reason: "No biometric authenticator available on this device",
            };
        }
    } catch (error) {
        return {
            supported: false,
            reason: "Could not check for biometric support",
        };
    }

    return { supported: true };
}

/**
 * Create a new passkey and generate an encryption key using PRF
 * @param username - User identifier
 * @returns Encryption key (32 bytes) and credential ID
 */
export async function createPasskeyEncryptionKey(
    username: string
): Promise<{ encryptionKey: ArrayBuffer; credentialId: string }> {
    const support = await checkBiometricSupport();
    if (!support.supported) {
        throw new Error(support.reason || "Biometric authentication not supported");
    }

    // Generate a deterministic salt for PRF
    const prfSalt = new Uint8Array(32).fill(1); // Simple salt, can be customized

    try {
        const credential = (await navigator.credentials.create({
            publicKey: {
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                rp: {
                    name: "Cadpay",
                    id: window.location.hostname === "localhost" ? "localhost" : window.location.hostname,
                },
                user: {
                    id: crypto.getRandomValues(new Uint8Array(16)),
                    name: username,
                    displayName: username,
                },
                pubKeyCredParams: [
                    { alg: -7, type: "public-key" }, // ES256
                    { alg: -257, type: "public-key" }, // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required",
                    requireResidentKey: true,
                },
                timeout: 60000,
                extensions: {
                    prf: {
                        eval: {
                            first: prfSalt,
                        },
                    },
                },
            },
        })) as PublicKeyCredential;

        // Extract credential ID
        const credentialId = btoa(
            String.fromCharCode(...new Uint8Array(credential.rawId))
        );

        // Extract the PRF output (encryption key)
        const extensionResults = credential.getClientExtensionResults();
        const prfResults = (extensionResults as any).prf?.results?.first;

        if (!prfResults) {
            throw new Error(
                "PRF extension not supported. Your device may not support this feature."
            );
        }

        return {
            encryptionKey: prfResults,
            credentialId,
        };
    } catch (error: any) {
        if (error.name === "NotAllowedError") {
            throw new Error("Biometric authentication was cancelled or timed out");
        }
        throw new Error(`Failed to create passkey: ${error.message}`);
    }
}

/**
 * Authenticate with existing passkey and retrieve encryption key
 * @param credentialId - Stored credential ID (base64)
 * @returns Encryption key (32 bytes)
 */
export async function authenticateAndGetKey(
    credentialId: string
): Promise<ArrayBuffer> {
    const support = await checkBiometricSupport();
    if (!support.supported) {
        throw new Error(support.reason || "Biometric authentication not supported");
    }

    // Same salt as used during creation
    const prfSalt = new Uint8Array(32).fill(1);

    try {
        // Convert credentialId back to ArrayBuffer
        const credentialIdBuffer = Uint8Array.from(atob(credentialId), (c) =>
            c.charCodeAt(0)
        ).buffer;

        const assertion = (await navigator.credentials.get({
            publicKey: {
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                rpId: window.location.hostname === "localhost" ? "localhost" : window.location.hostname,
                allowCredentials: [
                    {
                        id: credentialIdBuffer,
                        type: "public-key",
                    },
                ],
                userVerification: "required",
                timeout: 60000,
                extensions: {
                    prf: {
                        eval: {
                            first: prfSalt,
                        },
                    },
                },
            },
        })) as PublicKeyCredential;

        // Extract the PRF output (encryption key)
        const extensionResults = assertion.getClientExtensionResults();
        const prfResults = (extensionResults as any).prf?.results?.first;

        if (!prfResults) {
            throw new Error(
                "PRF extension not available. Cannot retrieve encryption key."
            );
        }

        return prfResults;
    } catch (error: any) {
        if (error.name === "NotAllowedError") {
            throw new Error("Biometric authentication was cancelled or denied");
        }
        throw new Error(`Failed to authenticate: ${error.message}`);
    }
}
