/**
 * Bigram-overlap fuzzy match — designed for short token catalogues
 * (tag names, course slugs, etc.) where adding `fuse.js` (~9 KB
 * gzipped) is overkill. Returns a 0..1 score; 1 = exact substring or
 * normalised equality, 0 = no overlap.
 *
 * Worked example — typo `apimanagemenet` vs `api-management`:
 *   - normalised: `apimanagemenet` (14 chars) vs `apimanagement` (13)
 *   - bigrams of needle: { ap, pi, im, ma, an, na, ag, ge, em, me, en, ne, et } → 13
 *   - bigrams of haystack: { ap, pi, im, ma, an, na, ag, ge, em, me, en, nt } → 12
 *   - intersection: 11 → score = 11 / max(13, 12) ≈ 0.85
 *
 * For the dropdown a 0.4 threshold strikes a good balance: keeps
 * real typos, drops unrelated tags (`kafka` vs `api-management` →
 * intersection {} → 0).
 */
export function fuzzyScore(needle: string, haystack: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const n = norm(needle);
  const h = norm(haystack);
  if (!n) return 1; // empty query keeps everything
  if (h.includes(n)) return 1; // substring (incl. exact) → max score
  // Bigrams need at least 2 chars on each side; for shorter tokens
  // the substring path above is the only signal.
  if (n.length < 2 || h.length < 2) return 0;
  const grams = (s: string) => {
    const out = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
    return out;
  };
  const a = grams(n);
  const b = grams(h);
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  return inter / Math.max(a.size, b.size);
}
