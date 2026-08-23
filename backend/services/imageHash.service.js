const sharp = require('sharp');

// A "difference hash" (dHash): resize to a small grid, compare each pixel to
// its right-hand neighbor, and record a 1/0 per comparison. Two images that
// look visually similar produce hashes that differ in very few bits, which
// is exactly what we need for practical (not cryptographic) duplicate
// detection — small edits like re-compression or minor crops barely move it.
const HASH_SIZE = 8; // -> 8x8 comparisons = 64-bit hash

async function computeDHash(buffer) {
  const { data } = await sharp(buffer)
    .resize(HASH_SIZE + 1, HASH_SIZE, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let hash = '';
  for (let row = 0; row < HASH_SIZE; row++) {
    for (let col = 0; col < HASH_SIZE; col++) {
      const leftIndex = row * (HASH_SIZE + 1) + col;
      const rightIndex = leftIndex + 1;
      hash += data[leftIndex] < data[rightIndex] ? '1' : '0';
    }
  }

  return hash;
}

async function computeDHashFromUrl(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download image for hashing (status ${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return computeDHash(Buffer.from(arrayBuffer));
}

/** Number of differing bits between two equal-length binary hash strings. */
function hammingDistance(hashA, hashB) {
  if (!hashA || !hashB || hashA.length !== hashB.length) {
    return Infinity;
  }

  let distance = 0;
  for (let i = 0; i < hashA.length; i++) {
    if (hashA[i] !== hashB[i]) distance++;
  }
  return distance;
}

module.exports = { computeDHash, computeDHashFromUrl, hammingDistance };