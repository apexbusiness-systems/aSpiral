## 2024-05-08 - [O(N^2) Array Spread inside Rapid State Updates]
**Learning:** Using array spread `new Set([...prev, id])` inside rapid `setTimeout` callbacks (like staggered loading) causes measurable O(N^2) CPU overhead and memory allocations.
**Action:** Always clone `Set` objects manually using `const next = new Set(prev); next.add(id); return next;` when updating state incrementally within tight loops.

## 2024-05-09 - [O(2N) Array Iterations on Render]
**Learning:** Checking for existence using `.some()` followed immediately by `.find()` to extract the element results in redundant O(N) array traversals (an O(2N) operation overall), which can impact frame rates when executed during a render cycle.
**Action:** Replace `const hasItem = arr.some(predicate); const item = arr.find(predicate);` with a single `const item = arr.find(predicate);`, using truthiness checks (`if (item)`) to determine existence while extracting the item simultaneously.
