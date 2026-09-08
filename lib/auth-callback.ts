/**
 * Validates the `next` destination to prevent open redirect vulnerabilities.
 * Ensures the target is strictly an internal application path on the current origin.
 */
export function getSafeNextPath(nextParam: string | null, defaultPath = "/reset-password"): string {
  if (!nextParam) return defaultPath;

  // Must begin with a single '/' and not '//' or '/\'
  if (nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.startsWith("/\\")) {
    try {
      const parsed = new URL(nextParam, "http://localhost");
      if (parsed.origin === "http://localhost") {
        return parsed.pathname + parsed.search + parsed.hash;
      }
    } catch {
      // Fall through to default on parse error
    }
  }

  return defaultPath;
}
