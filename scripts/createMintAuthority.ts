/**
 * CadPay Custom USDC Token Minter
 * 
 * This script creates a custom SPL token on Devnet that acts as "CadPay USDC"
 * You have mint authority and can airdrop unlimited tokens for testing
 * 
 * Run this ONCE to create your token mint:
 * node scripts/createToken.js
 */

import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function createMintAuthority() {
    console.log('🔑 Creating mint authority keypair...');

    // Generate new keypair for mint authority
    const mintAuthority = Keypair.generate();

    // Save to file
    const keypairPath = path.join(__dirname, '../.keys/mint-authority.json');
    const dir = path.dirname(keypairPath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
        keypairPath,
        JSON.stringify(Array.from(mintAuthority.secretKey))
    );

    console.log('✅ Mint authority created:', mintAuthority.publicKey.toBase58());
    console.log('📁 Saved to:', keypairPath);

    // Airdrop SOL for transaction fees
    console.log('💰 Requesting SOL airdrop...');
    const signature = await connection.requestAirdrop(
        mintAuthority.publicKey,
        2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(signature);
    console.log('✅ Received 2 SOL for fees');

    return mintAuthority;
}

async function main() {
    try {
        const mintAuthority = await createMintAuthority();

        console.log('\n📋 Next Steps:');
        console.log('1. Use this mint authority in your backend API');
        console.log('2. Create token mint using @solana/spl-token');
        console.log('3. Implement mint endpoint to airdrop tokens to users');
        console.log('\n⚠️  Keep .keys/ folder secure and in .gitignore!');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main();
