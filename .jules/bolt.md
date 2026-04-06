## 2024-04-06 - Hoist constant string transformations out of loop
**Learning:** Repeatedly transforming constant values (like calling `.toLowerCase()` on a search query) inside a `.filter()` callback wastes CPU cycles and slows down array iterations.
**Action:** Hoist constant transformations like `.toLowerCase()` out of the array iteration loop so it's calculated only once.
