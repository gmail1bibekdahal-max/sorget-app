/**
 * Environment configuration validator.
 * Validates essential keys for production runtime readiness.
 */

export function validateEnvironment(env = process.env) {
  const errors = [];
  const warnings = [];

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];

  for (const key of required) {
    if (!env[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  const recommended = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SITE_URL",
  ];

  for (const key of recommended) {
    if (!env[key]) {
      warnings.push(`Missing recommended production variable: ${key}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}