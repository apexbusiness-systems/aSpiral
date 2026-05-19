## 2024-05-19 - Fast Counting with Early Return
**Learning:** When calculating counts to check against a threshold (e.g., determining if a transcript matches multiple frustration patterns), chaining `.filter(condition).length >= threshold` forces evaluating the condition for every item and creates intermediate arrays.
**Action:** Use a single-pass `for` loop with an internal counter, and `return` immediately as soon as the threshold is met. This avoids memory allocation and avoids evaluating the rest of the array (e.g., avoiding expensive regex `.test()` calls) once the condition is met.
