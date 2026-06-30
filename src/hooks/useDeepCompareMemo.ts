import { useRef, type DependencyList } from "react";

/**
 * Shallow equality check for dependency arrays
 * For array dependencies, compares array length and item references
 */
export function areArraysShallowEqual(a: DependencyList, b: DependencyList): boolean {
  if (a.length !== b.length) return false;

  return a.every((aItem, i) => {
    const bItem = b[i];

    // For arrays (entities/connections), check length and item identity
    if (Array.isArray(aItem) && Array.isArray(bItem)) {
      if (aItem.length !== bItem.length) return false;

      // Shallow comparison: same items in same order = equal
      return aItem.every((val, j) => val === bItem[j]);
    }

    // For non-arrays, use reference equality
    return aItem === bItem;
  });
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
