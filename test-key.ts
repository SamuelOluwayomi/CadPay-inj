import { PrivateKey } from '@injectivelabs/sdk-ts';

const hexKey = '62716bb5fc8de9b4007872e0ac589c1cd93293ecd81ccda731ba1d53d5db349a';
const pk = PrivateKey.fromHex(hexKey);
console.log('Injective Address:', pk.toBech32());
console.log('EVM Address:', pk.toAddress().address);
