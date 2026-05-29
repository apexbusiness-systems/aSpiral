## 2024-05-25 - Avoid Nested Array Methods in Critical Validation Loops
**Learning:** Nested array methods (`forEach` containing `some`) inside validation functions like `validateCoherence` cause unnecessary closure allocations and prevent efficient early breaks. Additionally, mapping resultant arrays after filtering causes duplicate `O(N)` iterations.
**Action:** Replace `forEach` and `some` with standard `for` loops and `break` statements. Map necessary properties (like `label`) directly into the final output arrays (`kept`, `removed`) during the same pass to prevent multiple O(N) array iterations.
## 2024-05-25 - Avoid Intermediate Arrays When Calculating Aggregate Metrics
**Learning:** Extracting unique counts or aggregate sums via chained `.filter()`, `.map()`, and `new Set()` combinations causes unnecessary O(N) memory allocations and iteration overhead.
**Action:** Consolidate these operations into a single-pass standard `for` loop that tallies aggregates and adds to a non-cloned local `Set` simultaneously.
