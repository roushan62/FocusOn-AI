import crypto from "crypto";

/**
 * API-key vault helpers. Keys stored in Supabase are encrypted with
 * AES-256-GCM using a key derived (scrypt) from KEY_VAULT_SECRET.
 * Format: base64(iv).base64(tag).base64(ciphertext)
 */

function deriveKey(): Buffer {
  const secret = process.env.KEY_VAULT_SECRET;
  if (!secret) {
    throw new Error(
      "KEY_VAULT_SECRET is not set — add it to environment variables to store provider keys server-side."
    );
  }
  return crypto.scryptSync(secret, "foi-meetai-vault", 32);
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    deriveKey(),
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}
