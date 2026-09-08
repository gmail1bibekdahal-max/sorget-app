/**
 * Generate a production-safe unique tracking ID for projects.
 * Format: attr_<random-safe-identifier> (e.g. attr_k92jd82)
 */
export function generateTrackingId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let randomStr = "";
  for (let i = 0; i < 7; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `attr_${randomStr}`;
}

/**
 * Validate tracking ID format.
 * Must match attr_<alphanumeric>
 */
export function isValidTrackingId(trackingId: unknown): trackingId is string {
  if (typeof trackingId !== "string") return false;
  const trimmed = trackingId.trim();
  return /^attr_[a-zA-Z0-9_-]+$/.test(trimmed);
}
