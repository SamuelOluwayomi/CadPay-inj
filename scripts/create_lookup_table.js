const {
    Connection,
    Keypair,
    PublicKey,
    AddressLookupTableProgram,
    TransactionMessage,
    VersionedTransaction
} = require("@solana/web3.js");

// 1. SETUP
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Use the MINT_AUTHORITY keypair (same as in cadpayToken.ts)
const DEMO_SECRET = Uint8Array.from([121, 245, 208, 33, 94, 159, 22, 240, 87, 151, 101, 67, 181, 127, 48, 233, 186, 185, 186, 3, 61, 171, 139, 51, 104, 114, 29, 56, 133, 86, 143, 242, 117, 11, 164, 144, 110, 221, 28, 93, 146, 199, 6, 164, 47, 114, 51, 84, 158, 164, 141, 188, 79, 124, 17, 31, 251, 178, 145, 126, 174, 242, 186, 97]);
const wallet = Keypair.fromSecretKey(DEMO_SECRET);

async function createTable() {
    console.log("🚀 Creating Address Lookup Table...");
    console.log("Payer:", wallet.publicKey.toBase58());

    const slot = await connection.getSlot();

    // 2. CREATE TABLE INSTRUCTION
    const [lookupTableInst, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        recentSlot: slot,
    });

    console.log("📍 Table Address:", lookupTableAddress.toBase58());

    // 3. ADD COMMON ADDRESSES TO COMPRESS
    // These are the addresses taking up space in your tx
    const addressesToCompress = [
        new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // Token Program
        new PublicKey("11111111111111111111111111111111"),             // System Program
        new PublicKey("3D49QorJyNaL4rcpiynbuS3pRH4Y7EXEM6v6ZGaqfFGK"),  // CADPAY_MINT (from cadpayToken.ts)
        new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),  // Associated Token Program
    ];

    const extendInst = AddressLookupTableProgram.extendLookupTable({
        payer: wallet.publicKey,
        authority: wallet.publicKey,
        lookupTable: lookupTableAddress,
        addresses: addressesToCompress,
    });

    // 4. SEND AS v0 TRANSACTION
    const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
        instructions: [lookupTableInst, extendInst],
    }).compileToV0Message();

    const tx = new VersionedTransaction(messageV0);
    tx.sign([wallet]);

    const txid = await connection.sendTransaction(tx);
    await connection.confirmTransaction(txid);

    console.log("✅ Lookup Table Created! Tx:", txid);
    console.log("👉 SAVE THIS ADDRESS:", lookupTableAddress.toBase58());
    console.log("\n📝 Add this to your .env.local:");
    console.log(`NEXT_PUBLIC_LOOKUP_TABLE_ADDRESS=${lookupTableAddress.toBase58()}`);
}

createTable().catch(console.error);
