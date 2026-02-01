const { Keypair } = require('@solana/web3.js');
const secret = Array.from(Keypair.generate().secretKey);
console.log('VALID_SECRET_KEY=[' + secret.toString() + ']');
