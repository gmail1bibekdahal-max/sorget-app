import crypto from "crypto";

export function signPayload(payloadString, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payloadString, "utf8");
  return `sha256=${hmac.digest("hex")}`;
}

export function verifySignature(payloadString, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const expected = signPayload(payloadString, secret);
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}
