import { createHash } from "node:crypto";
import { importJWK, jwtVerify, type JWK } from "jose";
import { plaid } from "@/lib/plaid";

// In-memory cache for Plaid webhook verification keys.
const keyCache = new Map<string, { key: JWK; cachedAt: number }>();
const KEY_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function getVerificationKey(kid: string): Promise<JWK> {
  const cached = keyCache.get(kid);
  if (cached && Date.now() - cached.cachedAt < KEY_TTL_MS) return cached.key;

  const resp = await plaid.webhookVerificationKeyGet({ key_id: kid });
  const key = resp.data.key as unknown as JWK;
  keyCache.set(kid, { key, cachedAt: Date.now() });
  return key;
}

/**
 * Verifies a Plaid webhook by checking the JWT in the `Plaid-Verification`
 * header. Returns true if valid. Throws on malformed input.
 *
 * Plaid signs each webhook with ES256. The JWT payload includes
 * `request_body_sha256` which must equal sha256(rawBody).
 */
export async function verifyPlaidWebhook(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader) return false;

  // Decode header without verifying to extract kid
  const parts = signatureHeader.split(".");
  if (parts.length !== 3) return false;
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
  const kid = header.kid as string | undefined;
  if (!kid) return false;
  if (header.alg !== "ES256") return false;

  const jwk = await getVerificationKey(kid);
  const key = await importJWK(jwk, "ES256");

  let payload: { request_body_sha256?: string; iat?: number };
  try {
    const verified = await jwtVerify(signatureHeader, key, {
      algorithms: ["ES256"],
    });
    payload = verified.payload as typeof payload;
  } catch {
    return false;
  }

  // Reject stale signatures (> 5 minutes old)
  if (!payload.iat || Date.now() / 1000 - payload.iat > 5 * 60) return false;

  const expected = createHash("sha256").update(rawBody).digest("hex");
  if (payload.request_body_sha256 !== expected) return false;

  return true;
}
