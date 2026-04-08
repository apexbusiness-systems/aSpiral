## 2024-04-06 - Hoist constant string transformations out of loop
**Learning:** Repeatedly transforming constant values (like calling `.toLowerCase()` on a search query) inside a `.filter()` callback wastes CPU cycles and slows down array iterations.
**Action:** Hoist constant transformations like `.toLowerCase()` out of the array iteration loop so it's calculated only once.
## 2026-04-08 - [Remove Redundant Client-Side Filtering]\n**Learning:** When fetching data pre-filtered by the database using Supabase `.in()` clauses, avoid applying redundant client-side `.filter()` on the resulting array to prevent unnecessary O(N) operations.\n**Action:** Assign fetched array data directly instead of iterating through it when the data matches constraints.
