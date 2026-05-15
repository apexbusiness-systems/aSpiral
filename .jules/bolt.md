## 2024-05-08 - [O(N^2) Array Spread inside Rapid State Updates]
**Learning:** Using array spread `new Set([...prev, id])` inside rapid `setTimeout` callbacks (like staggered loading) causes measurable O(N^2) CPU overhead and memory allocations.
**Action:** Always clone `Set` objects manually using `const next = new Set(prev); next.add(id); return next;` when updating state incrementally within tight loops.

## 2024-05-09 - [O(2N) Array Iterations on Render]
**Learning:** Checking for existence using `.some()` followed immediately by `.find()` to extract the element results in redundant O(N) array traversals (an O(2N) operation overall), which can impact frame rates when executed during a render cycle.
**Action:** Replace `const hasItem = arr.some(predicate); const item = arr.find(predicate);` with a single `const item = arr.find(predicate);`, using truthiness checks (`if (item)`) to determine existence while extracting the item simultaneously.
## 2024-05-11 - [Optimize String Processing `countSentences`]
**Learning:** Chaining `.split().map().filter()` causes severe O(N) memory allocations when processing continuously updating text like voice transcripts in `useSpiralAI.ts`.
**Action:** Replace functional array pipelines with a simple O(N) loop iterating over characters using `O(1)` space when analyzing text streams in React hooks.
## 2024-05-12 - [O(N) Optimization for Stats Filtering]
**Learning:** Replaced chained array functions (.filter, .length) with a single-pass loop when calculating multiple derived metrics (like completed vs fallbacks). This optimization eliminates O(N) array copying operations and performs them in true O(N) time with O(1) space, crucial for rapidly-called history processing where dataset sizes can scale.
**Action:** Always prefer a single `for` loop iteration when calculating multiple aggregates from the same array over chaining multiple `.filter().length` calls to minimize GC pressure and memory allocations.
## 2024-05-13 - [O(N) Optimization for Stats Filtering]
**Learning:** Replaced chained array functions (`.filter()`, `.map()`, `.reduce()`) with a single-pass loop when calculating multiple derived metrics (`sentiment`, `frictionIntensity`). This optimization eliminates O(N) array copying operations and performs them in true O(N) time with O(1) space, crucial for rapidly-called history processing where dataset sizes can scale.
**Action:** Always prefer a single `for` loop iteration when calculating multiple aggregates from the same array over chaining multiple functional operations to minimize GC pressure and memory allocations.
## 2024-05-14 - [O(N) Optimization for Stats Filtering with Set]
**Learning:** Replaced chained array functions (`.map().size`) and `.reduce()` with a single-pass loop when calculating multiple derived metrics (`uniqueVariants`, `averageIntensity`). This optimization eliminates O(N) array copying operations and redundant iteration passes, performing them in true O(N) time with O(1) space (excluding the Set). This is crucial for rapidly-called history processing where dataset sizes can scale.
**Action:** Always prefer a single `for` loop iteration when calculating multiple aggregates from the same array over chaining multiple functional operations (including Set creation from a mapped array) to minimize GC pressure and memory allocations.
