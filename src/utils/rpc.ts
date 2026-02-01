import { Connection } from '@solana/web3.js';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a Connection and verify the RPC is responsive by calling getVersion.
 * Retries a few times with exponential backoff before throwing.
 */
export async function createConnectionWithRetry(url?: string, attempts = 3, initialDelay = 500) {
    const rpc = url || process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';
    // #region agent log
    
    // #endregion
    let lastErr: any = null;
    for (let i = 0; i < attempts; i++) {
        try {
            const conn = new Connection(rpc, 'confirmed');
            // Quick health check
            await conn.getVersion();
            // #region agent log
            
            // #endregion
            return conn;
        } catch (e: any) {
            lastErr = e;
            // #region agent log
            
            // #endregion
            const delay = initialDelay * Math.pow(2, i);
            await sleep(delay);
        }
    }
    // Final attempt without catching to surface the error
    if (lastErr) throw lastErr;
    return new Connection(rpc, 'confirmed');
}

export function getDefaultRpcUrl() {
    return process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';
}
