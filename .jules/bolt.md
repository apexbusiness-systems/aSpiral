## 2024-04-06 - Hoist constant string transformations out of loop
**Learning:** Repeatedly transforming constant values (like calling `.toLowerCase()` on a search query) inside a `.filter()` callback wastes CPU cycles and slows down array iterations.
**Action:** Hoist constant transformations like `.toLowerCase()` out of the array iteration loop so it's calculated only once.
## 2026-04-08 - [Remove Redundant Client-Side Filtering]\n**Learning:** When fetching data pre-filtered by the database using Supabase `.in()` clauses, avoid applying redundant client-side `.filter()` on the resulting array to prevent unnecessary O(N) operations.\n**Action:** Assign fetched array data directly instead of iterating through it when the data matches constraints.
## 2024-04-11 - [Hoist string transformation out of loop]
**Learning:** Calling `.toLowerCase()` repeatedly inside an inner loop, such as array iteration via `.some()` across a list of strings (`VOICE_STOP_KEYWORDS`), incurs a measurable performance overhead. By hoisting the string conversion out of the loop and computing it once, we save CPU cycles per frame or event tick without compromising readability.
**Action:** Extract expensive transformations like `.toLowerCase()` outside iterative checks to ensure they are calculated exactly once.
## 2024-04-14 - Optimize Date filtering in loops
**Learning:** Instantiating `Date` objects and utilizing heavy date utility functions (like `isBefore`/`isAfter` from `date-fns`) inside array iterations (e.g., `.filter()`) causes measurable overhead.
**Action:** Extract timestamp conversions (`.getTime()`) outside the loop and use primitive numeric comparisons (`>` and `<`) for efficient date filtering.
## 2026-04-16 - [Cache expensive date-dependent templates]
**Learning:** Generating fixed-length temporal templates (e.g., last 7 days) involves expensive date-fns calls (format, subDays, startOfDay) which are redundant if processed repeatedly within the same day.
**Action:** Cache these templates at the module level using a start-of-day timestamp for invalidation, ensuring to return fresh clones if the template is mutated by the consumer.
## 2024-05-19 - Wire VoiceConductor and fix strict-mode build errors
**Learning:** Hardcoded dependencies (`require` lacking types) and non-strict types (`catch (err: any)`) will fail production build environments with standard TypeScript setups.
**Action:** Always prefer Vitest mocking like `vi.stubGlobal` over `require` injection for global variables when ambient types are absent, and use `unknown` in catch blocks. Ensure exhaustive dependencies are provided in `useCallback`.
## 2024-05-20 - [Zustand State Synchronization for Deduplication Lookups]
**Learning:** When optimizing Zustand stores with O(1) lookup maps (e.g., `_entityLookup` and `_connectionLookup`) alongside arrays to avoid O(N) deduplication loops, any function that performs bulk updates or replaces the array state (such as `updateSession` or Rehydration) must reconstruct the lookup maps. If they are merely initialized to empty objects, subsequent operations will fail to recognize pre-existing items, breaking deduplication and state integrity.
**Action:** Always rebuild auxiliary lookup maps iteratively whenever their underlying source-of-truth arrays are replaced or bulk-updated in the store, and ensure `useStore.setState` is used within rehydration callbacks rather than directly mutating the state argument.
