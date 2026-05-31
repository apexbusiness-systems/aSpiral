## 2024-05-25 - Avoid Nested Array Methods in Critical Validation Loops
**Learning:** Nested array methods (`forEach` containing `some`) inside validation functions like `validateCoherence` cause unnecessary closure allocations and prevent efficient early breaks. Additionally, mapping resultant arrays after filtering causes duplicate `O(N)` iterations.
**Action:** Replace `forEach` and `some` with standard `for` loops and `break` statements. Map necessary properties (like `label`) directly into the final output arrays (`kept`, `removed`) during the same pass to prevent multiple O(N) array iterations.
## 2024-05-26 - Eliminate Intermediate Arrays in Derived Metric Calculations
**Learning:** Chaining array methods (`.filter().length`, `.map().reduce()`, `new Set(arr.map())`) to calculate derived metrics from a history or state array leads to unnecessary multi-pass O(N) traversals and intermediate memory allocations (garbage).
**Action:** Consolidate derived metric logic into a single-pass standard `for` loop. Increment counters and manually populate sets (e.g. `set.add(item)`) during this single pass to achieve O(1) space and faster O(N) time for statistics aggregations.
