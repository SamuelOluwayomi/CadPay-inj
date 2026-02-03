/**
 * Recovery Kit utility for downloading wallet backup files
 */

export interface RecoveryKitData {
    address: string;
    mnemonic: string;
    timestamp: string;
}

/**
 * Generate and auto-download a recovery kit file
 * @param address - Kaspa wallet address
 * @param mnemonic - Seed phrase
 */
export function downloadRecoveryKit(address: string, mnemonic: string): void {
    const timestamp = new Date().toISOString();

    const content = `
═══════════════════════════════════════════════
         CADPAY WALLET RECOVERY KIT
═══════════════════════════════════════════════

⚠️  CRITICAL: DO NOT SHARE THIS FILE
Keep this file safe and secure. Anyone with access
to this information can control your wallet.

─────────────────────────────────────────────────
Public Address:
${address}

Secret Seed Phrase (Mnemonic):
${mnemonic}

Created: ${timestamp}
─────────────────────────────────────────────────

BACKUP INSTRUCTIONS:
1. Store this file in a secure location (encrypted drive, password manager)
2. Consider printing a physical copy and storing it in a safe
3. Never share this file or seed phrase with anyone
4. You can restore your wallet on any device using this seed phrase

═══════════════════════════════════════════════
              Powered by Cadpay
═══════════════════════════════════════════════
  `.trim();

    // Create blob and download
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadpay-recovery-${address.slice(0, 8)}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Parse a recovery kit file
 * @param fileContent - Content of the recovery kit file
 * @returns Parsed recovery data or null
 */
export function parseRecoveryKit(fileContent: string): RecoveryKitData | null {
    try {
        const addressMatch = fileContent.match(/Public Address:\s*\n(.+)/);
        const mnemonicMatch = fileContent.match(/Secret Seed Phrase \(Mnemonic\):\s*\n(.+)/);
        const timestampMatch = fileContent.match(/Created:\s*(.+)/);

        if (!addressMatch || !mnemonicMatch) {
            return null;
        }

        return {
            address: addressMatch[1].trim(),
            mnemonic: mnemonicMatch[1].trim(),
            timestamp: timestampMatch ? timestampMatch[1].trim() : '',
        };
    } catch (error) {
        console.error('Failed to parse recovery kit:', error);
        return null;
    }
}
