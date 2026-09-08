import {
  rateLimit as _rateLimit,
  RATE_LIMITS as BASE_RATE_LIMITS,
} from "@/src/rate-limit.js";

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export const rateLimit: (identifier: string, config: RateLimitConfig) => RateLimitResult = _rateLimit as any;
export const RATE_LIMITS: Record<string, RateLimitConfig> = BASE_RATE_LIMITS as any;