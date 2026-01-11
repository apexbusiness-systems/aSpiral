/**
 * [SECURE] Parses CSS HSL strings without regex backtracking.
 * Replaces vulnerable HSL_PATTERN.
 * @param raw Input string (e.g., "280 85% 65%")
 */
export function parseHsl(raw: string): { h: number; s: number; l: number } | null {
    // O(n) split operation - immune to ReDoS
    const parts = raw.trim().split(/[\s,]+/).filter(Boolean);

    if (parts.length !== 3) return null;

    const [hStr, sStr, lStr] = parts;
    const h = parseFloat(hStr);
    const s = parseFloat(sStr.replace('%', ''));
    const l = parseFloat(lStr.replace('%', ''));

    if (isNaN(h) || isNaN(s) || isNaN(l)) return null;

    // Normalized to 0-1 range for Three.js
    return { h, s: s / 100, l: l / 100 };
}
