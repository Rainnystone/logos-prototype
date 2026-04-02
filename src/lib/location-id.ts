const HEX_BYTES = 3;
const HEX_RADIX = 16;

let fallbackCounter = 0;

function fillFallbackBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  let seed = (Date.now() ^ (fallbackCounter += 1)) >>> 0;

  for (let index = 0; index < size; index += 1) {
    seed = Math.imul(seed ^ (seed >>> 15), 1 | seed) >>> 0;
    bytes[index] = seed & 0xff;
  }

  return bytes;
}

function getRandomBytes(size: number): Uint8Array {
  const crypto = globalThis.crypto;

  if (crypto?.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(size));
  }

  return fillFallbackBytes(size);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(HEX_RADIX).padStart(2, '0')).join('');
}

export function generateLocationId(): string {
  return `loc_${toHex(getRandomBytes(HEX_BYTES))}`;
}
