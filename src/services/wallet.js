/**
 * Wallet service: Secp256k1 keypair generation and BCH P2PKH testnet address derivation.
 * Uses @bitauth/libauth.
 */

import {
  binToHex,
  privateKeyToP2pkhCashAddress,
  secp256k1,
} from '@bitauth/libauth';

const PRIVATE_KEY_LENGTH = 32;

/**
 * Generates a cryptographically secure 32-byte value suitable as a Secp256k1 private key.
 * Retries until the value is valid per secp256k1 (in range [1, n-1]).
 * @returns {Uint8Array} 32-byte private key
 */
function generatePrivateKey() {
  const key = new Uint8Array(PRIVATE_KEY_LENGTH);
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    crypto.getRandomValues(key);
    if (secp256k1.validatePrivateKey(key)) {
      return key;
    }
  }
  throw new Error('Failed to generate valid private key after retries');
}

/**
 * Derives the compressed (33-byte) public key from a Secp256k1 private key.
 * @param {Uint8Array} privateKey - 32-byte private key
 * @returns {Uint8Array} 33-byte compressed public key
 */
function derivePublicKey(privateKey) {
  const result = secp256k1.derivePublicKeyCompressed(privateKey);
  if (typeof result === 'string') {
    throw new Error(result);
  }
  return result;
}

/**
 * Generates a new wallet: Secp256k1 keypair and BCH testnet P2PKH address.
 * @returns {{ privateKeyHex: string, publicKeyHex: string, testnetAddress: string }}
 */
export function generateNewWallet() {
  const privateKey = generatePrivateKey();
  const publicKey = derivePublicKey(privateKey);

  const addressResult = privateKeyToP2pkhCashAddress({
    privateKey,
    prefix: 'bchtest',
    throwErrors: true,
  });

  if (typeof addressResult === 'string') {
    throw new Error(addressResult);
  }

  return {
    privateKeyHex: binToHex(privateKey),
    publicKeyHex: binToHex(publicKey),
    testnetAddress: addressResult.address,
  };
}
