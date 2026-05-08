## 2024-05-08 - [O(N^2) Array Spread inside Rapid State Updates]
**Learning:** Using array spread `new Set([...prev, id])` inside rapid `setTimeout` callbacks (like staggered loading) causes measurable O(N^2) CPU overhead and memory allocations.
**Action:** Always clone `Set` objects manually using `const next = new Set(prev); next.add(id); return next;` when updating state incrementally within tight loops.
