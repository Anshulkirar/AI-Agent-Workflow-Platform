/*
 * RFC 6238 time-based one-time passwords, verified in the browser with Web
 * Crypto. This proves an authenticator app is set up correctly; enforcing the
 * code at sign-in needs the auth backend, which this demo doesn't have.
 */

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function randomBytes(length: number) {
  return crypto.getRandomValues(new Uint8Array(length));
}

function base32Encode(bytes: Uint8Array) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input: string) {
  const clean = input.replace(/[\s=-]/g, "").toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error("Invalid secret");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

export function generateSecret() {
  return base32Encode(randomBytes(20));
}

export function otpauthUri(secret: string, account: string, issuer = "AgentFlow") {
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

async function codeAt(secret: string, counter: number) {
  const message = new ArrayBuffer(8);
  const view = new DataView(message);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const key = await crypto.subtle.importKey("raw", base32Decode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, message));
  const offset = hmac[hmac.length - 1]! & 15;
  const binary =
    ((hmac[offset]! & 127) << 24) | (hmac[offset + 1]! << 16) | (hmac[offset + 2]! << 8) | hmac[offset + 3]!;
  return String(binary % 1_000_000).padStart(6, "0");
}

/** Accepts the current code and one step either side for clock drift. */
export async function verifyTotp(secret: string, code: string, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return false;
  if (!crypto?.subtle) throw new Error("Web Crypto is unavailable (needs HTTPS or localhost).");
  const counter = Math.floor(now / 30_000);
  for (const drift of [0, -1, 1]) {
    if ((await codeAt(secret, counter + drift)) === code) return true;
  }
  return false;
}

/** One-time recovery codes like "k3f9-2xq7". */
export function recoveryCodes(count = 10) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: count }, () => {
    const chars = Array.from(randomBytes(8), (byte) => alphabet[byte % alphabet.length]).join("");
    return `${chars.slice(0, 4)}-${chars.slice(4)}`;
  });
}

/** Random API key secret, e.g. "af_live_7Kq…". */
export function apiKeySecret(prefix: string) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return prefix + Array.from(randomBytes(32), (byte) => alphabet[byte % alphabet.length]).join("");
}
