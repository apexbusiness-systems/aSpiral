import { useRef, type DependencyList } from "react";

/**
 * Shallow equality check for dependency arrays
 * For array dependencies, compares array length and item references
 */
export function areArraysShallowEqual(a: DependencyList, b: DependencyList): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const aItem = a[i];
    const bItem = b[i];

    // For arrays (entities/connections), check length and item identity
    if (Array.isArray(aItem) && Array.isArray(bItem)) {
      if (aItem.length !== bItem.length) return false;

      // Shallow comparison: same items in same order = equal
      let allMatch = true;
      for (let j = 0; j < aItem.length; j++) {
        if (aItem[j] !== bItem[j]) {
          allMatch = false;
          break;
        }
      }
      if (allMatch) continue;
      return false;
    }

    // For non-arrays, use reference equality
    if (aItem !== bItem) return false;
  }

  return true;
}

/**
 * Deep comparison hook for arrays - prevents memo invalidation when array content is identical
 * but reference changes (common with Zustand state updates)
 */
export function useDeepCompareMemo<T>(factory: () => T, deps: DependencyList): T {
  const ref = useRef<{ deps: DependencyList; value: T } | undefined>(undefined);

  if (!ref.current || !areArraysShallowEqual(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() };
  }

  return ref.current.value;
}
