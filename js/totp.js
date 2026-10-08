const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input) {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of clean) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

function intToBytes(num) {
  const bytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = num & 0xff;
    num = Math.floor(num / 256);
  }
  return bytes;
}

const HASH_ALGO = { SHA1: "SHA-1", SHA256: "SHA-256", SHA512: "SHA-512" };

async function hmac(keyBytes, msgBytes, algorithm) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: HASH_ALGO[algorithm] || HASH_ALGO.SHA1 },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgBytes);
  return new Uint8Array(sig);
}

async function generateTOTP(secretBase32, { digits = 6, period = 30, algorithm = "SHA1", timestamp = Date.now() } = {}) {
  const counter = Math.floor(timestamp / 1000 / period);
  const key = base32Decode(secretBase32);
  const msg = intToBytes(counter);
  const hmacResult = await hmac(key, msg, algorithm);

  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const binCode =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  const code = (binCode % 10 ** digits).toString().padStart(digits, "0");
  return code;
}

function secondsRemaining(period = 30, timestamp = Date.now()) {
  const elapsed = Math.floor(timestamp / 1000) % period;
  return period - elapsed;
}

function parseOtpAuthUri(uri) {
  const url = new URL(uri);
  if (url.protocol !== "otpauth:") throw new Error("URI não é otpauth://");
  if (url.host !== "totp") throw new Error("Apenas TOTP é suportado");

  const label = decodeURIComponent(url.pathname.replace(/^\//, ""));
  let issuer = url.searchParams.get("issuer") || "";
  let account = label;
  if (label.includes(":")) {
    const [labelIssuer, labelAccount] = label.split(":");
    if (!issuer) issuer = labelIssuer;
    account = labelAccount;
  }

  const secret = url.searchParams.get("secret");
  if (!secret) throw new Error("QR code sem segredo (secret)");

  return {
    issuer: issuer.trim(),
    account: account.trim(),
    secret: secret.trim(),
    algorithm: (url.searchParams.get("algorithm") || "SHA1").toUpperCase(),
    digits: parseInt(url.searchParams.get("digits") || "6", 10),
    period: parseInt(url.searchParams.get("period") || "30", 10),
  };
}

export { generateTOTP, secondsRemaining, parseOtpAuthUri, base32Decode };
