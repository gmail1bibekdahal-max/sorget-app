/**
 * storage.js
 *
 * Browser localStorage wrapper for first-touch attribution persistence.
 *
 * Key invariants:
 * 1. First-touch data is written ONCE and never overwritten.
 * 2. Subsequent calls to saveFirstTouch() are no-ops if valid data already exists.
 * 3. Corrupted / invalid storage is handled gracefully and cleaned up safely.
 */

const STORAGE_KEY_FIRST = "attributer_first_touch";
const STORAGE_KEY_LAST  = "attributer_last_touch";

/** Default expiration TTL: 90 days in milliseconds */
export const DEFAULT_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** Current storage envelope schema version */
export const STORAGE_SCHEMA_VERSION = 1;

/**
 * Helper to safely access localStorage.
 * Returns null if localStorage is not available (e.g. disabled or non-browser environment).
 */
function getStorage() {
    try {
        if (typeof globalThis !== "undefined" && globalThis.localStorage) {
            return globalThis.localStorage;
        }
        if (typeof window !== "undefined" && window.localStorage) {
            return window.localStorage;
        }
    } catch {
        return null;
    }
    return null;
}

/**
 * Wraps raw attribution data inside a versioned envelope with TTL metadata.
 */
export function wrapStorageEnvelope(data, ttlMs = DEFAULT_TTL_MS) {
    const now = Date.now();
    return {
        version: STORAGE_SCHEMA_VERSION,
        storedAt: now,
        expiresAt: now + ttlMs,
        data: data,
        ...(typeof data === "object" && data !== null ? data : {}),
    };
}

/**
 * Persist first-touch attribution to localStorage with TTL.
 * If valid unexpired first-touch attribution is already stored, this is a no-op (immutable).
 *
 * @param {object} attribution - The attribution object to store.
 * @param {number} [ttlMs]     - Optional TTL in ms (default 90 days).
 */
export function saveFirstTouch(attribution, ttlMs = DEFAULT_TTL_MS) {
    const storage = getStorage();
    if (!storage || !attribution || typeof attribution !== "object") return;

    // If valid unexpired first-touch data already exists, do nothing (immutable)
    if (getFirstTouch() !== null) {
        return;
    }

    try {
        const envelope = wrapStorageEnvelope(attribution, ttlMs);
        storage.setItem(STORAGE_KEY_FIRST, JSON.stringify(envelope));
    } catch {
        // Ignore quota or write errors gracefully
    }
}

/**
 * Retrieve the stored first-touch attribution data.
 * Checks expiration and automatically handles migration from legacy flat format.
 *
 * @returns {object|null} The stored attribution data object, or null if expired or not set.
 */
export function getFirstTouch() {
    return _readStorageKey(STORAGE_KEY_FIRST);
}

/**
 * Clear stored first-touch attribution.
 */
export function clearFirstTouch() {
    _removeStorageKey(STORAGE_KEY_FIRST);
}

/**
 * Persist last-touch attribution to localStorage with TTL.
 *
 * @param {object} attribution - The attribution object to store.
 * @param {number} [ttlMs]     - Optional TTL in ms (default 90 days).
 */
export function saveLastTouch(attribution, ttlMs = DEFAULT_TTL_MS) {
    const storage = getStorage();
    if (!storage || !attribution || typeof attribution !== "object") return;

    try {
        const envelope = wrapStorageEnvelope(attribution, ttlMs);
        storage.setItem(STORAGE_KEY_LAST, JSON.stringify(envelope));
    } catch {
        // Ignore write errors gracefully
    }
}

/**
 * Retrieve the stored last-touch attribution data.
 *
 * @returns {object|null}
 */
export function getLastTouch() {
    return _readStorageKey(STORAGE_KEY_LAST);
}

/**
 * Clear stored last-touch attribution.
 */
export function clearLastTouch() {
    _removeStorageKey(STORAGE_KEY_LAST);
}

/**
 * Clear all stored attribution (first and last touch).
 */
export function clearAllAttribution() {
    clearFirstTouch();
    clearLastTouch();
}

/**
 * Helper to read, validate, migrate, and check expiration for a storage key.
 */
function _readStorageKey(key) {
    const storage = getStorage();
    if (!storage) return null;

    let stored = null;
    try {
        stored = storage.getItem(key);
    } catch {
        return null;
    }

    if (stored === null || stored === undefined) {
        return null;
    }

    try {
        const parsed = JSON.parse(stored);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            storage.removeItem(key);
            return null;
        }

        const now = Date.now();

        // 1. Check if parsed is versioned envelope
        if (parsed.version && parsed.data && typeof parsed.data === "object") {
            // Check expiration
            if (typeof parsed.expiresAt === "number" && now > parsed.expiresAt) {
                // Record expired — clean up and return null
                storage.removeItem(key);
                return null;
            }
            return parsed.data;
        }

        // 2. Backward compatibility: Legacy flat attribution object without envelope
        if (parsed.channel || parsed.source || parsed.medium || parsed.landingUrl || parsed.landingPage) {
            // Transparently migrate to versioned envelope
            try {
                const migrated = wrapStorageEnvelope(parsed, DEFAULT_TTL_MS);
                storage.setItem(key, JSON.stringify(migrated));
            } catch {}
            return parsed;
        }

        // Unrecognized format — clean up
        storage.removeItem(key);
        return null;
    } catch {
        try {
            storage.removeItem(key);
        } catch {}
        return null;
    }
}

/**
 * Helper to remove a key safely.
 */
function _removeStorageKey(key) {
    const storage = getStorage();
    if (!storage) return;
    try {
        storage.removeItem(key);
    } catch {}
}