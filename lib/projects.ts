/**
 * Shared Project Query & Sorting Utilities for Sorget
 *
 * Enforces canonical deterministic ordering across all dashboard pages,
 * navigation components, selectors, and API endpoints.
 *
 * Canonical Order:
 * 1. Primary sort: created_at ASC (actual creation order, earliest first)
 * 2. Secondary sort: id ASC (stable deterministic tiebreaker)
 */

export interface CanonicalProjectItem {
  id: string;
  name: string;
  created_at?: string | null;
  [key: string]: any;
}

/**
 * Deterministically sorts an array of projects according to canonical order:
 * Primary: created_at ASC
 * Secondary: id ASC
 */
export function sortProjectsCanonically<T extends { id: string; created_at?: string | null }>(
  projects: T[]
): T[] {
  if (!Array.isArray(projects)) return [];
  return [...projects].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return a.id.localeCompare(b.id);
  });
}
