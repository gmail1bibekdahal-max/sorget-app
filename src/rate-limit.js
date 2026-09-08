const store = new Map();

export function rateLimit(identifier, config) {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = identifier;

  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt: now + windowMs,
    };
  }

  if (entry.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.windowStart + windowMs,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetAt: entry.windowStart + windowMs,
  };
}

export const RATE_LIMITS = {
  leadCapture: { limit: 30, windowSeconds: 60 },
  billingWebhook: { limit: 60, windowSeconds: 60 },
  oauth: { limit: 10, windowSeconds: 60 },
  auth: { limit: 5, windowSeconds: 60 },
  analytics: { limit: 20, windowSeconds: 60 },
};