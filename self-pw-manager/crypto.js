async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 250000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptVault(password, data) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const encoded = enc.encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return { salt: Array.from(salt), iv: Array.from(iv), data: Array.from(new Uint8Array(ciphertext)) };
}

async function decryptVault(password, encrypted) {
  const salt = new Uint8Array(encrypted.salt);
  const iv = new Uint8Array(encrypted.iv);
  const key = await deriveKey(password, salt);
  const data = new Uint8Array(encrypted.data);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(plaintext));
}