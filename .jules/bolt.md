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
## $(date +%Y-%m-%d) - [Optimize count with early returns]
**Learning:** Found a common performance anti-pattern where `.filter(condition).length` was used just to check if a small threshold of matches existed, causing unnecessary regex evaluations across the whole array.
**Action:** Replace `.filter().length` with standard `for` loops utilizing early returns when counting occurrences to meet a threshold condition. This prevents O(N) evaluation of expensive operations (like regex matches) when the condition is met early.

## 2024-05-14 - [O(N) Optimization: Early returns for threshold counting]
**Learning:** Checking for threshold occurrences using `.filter(condition).length >= N` forces iteration over the entire array, causing unnecessary evaluations (like regex testing) and intermediate array allocations.
**Action:** Replace `.filter().length` threshold checks with a `for` loop that increments a counter and returns early when the threshold is met to achieve O(N) time with short-circuiting and O(1) space.

## 2024-05-14 - [O(N) Optimization: Avoiding .filter() for single matches]
**Learning:** Using `.filter(condition)` to check for existence or find a single element unnecessarily evaluates the entire array and allocates a new one.
**Action:** Always prefer `.find(condition)` over `.filter(condition)` when only one matching element is needed, which halts execution upon the first match and avoids array allocations.
