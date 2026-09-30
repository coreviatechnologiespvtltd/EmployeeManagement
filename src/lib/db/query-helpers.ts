/**
 * Small helpers shared by the service modules in `src/lib/api`.
 */

/**
 * Builds a case-insensitive "contains" pattern, escaping the LIKE
 * metacharacters so a user typing `%` or `_` searches for those characters
 * literally instead of matching every row.
 *
 * Call sites pair this with `ilike(column, likePattern(q), sql`escape '\\'`)`.
 */
export function likePattern(query: string): string {
  const escaped = query.trim().replace(/[\\%_]/g, "\\$&");
  return `%${escaped}%`;
}

/** `[start, end)` bounds for a `YYYY-MM` month key, for `date` range filters. */
export function monthRange(month: string): { start: string; end: string } {
  const [year, monthPart] = month.split("-").map(Number);
  const nextYear = monthPart === 12 ? year + 1 : year;
  const nextMonth = monthPart === 12 ? 1 : monthPart + 1;
  return {
    start: `${year}-${String(monthPart).padStart(2, "0")}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}
