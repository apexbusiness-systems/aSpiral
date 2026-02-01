CI Success
failed 3 hours ago in 3s
Search logs
0s
0s
Run if [ "failure" != "success" ]; then
❌ Build failed
Error: Process completed with exit code 1.



=======================================================================================================================================================================================================================================



Build & Lint
failed 3 hours ago in 21s
Search logs
1s
1s
2s
11s
4s
Run npm run lint --if-present

> aspiral@1.0.0 lint
> eslint .


/home/runner/work/aSpiral/aSpiral/src/components/3d/BreakthroughEffect.tsx
Warning:   115:18  warning  The ref value 'sceneRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'sceneRef.current' to a variable inside the effect, and use that variable in the cleanup function  react-hooks/exhaustive-deps

/home/runner/work/aSpiral/aSpiral/src/components/cinematics/CinematicPlayer.tsx
Warning:   329:6  warning  React Hook useEffect has a missing dependency: 'handleSkip'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/home/runner/work/aSpiral/aSpiral/src/components/cinematics/CinematicWrapper.tsx
Error:   1:1  error  Definition for rule 'react/no-unknown-property' was not found  react/no-unknown-property

/home/runner/work/aSpiral/aSpiral/src/components/cinematics/MatrixDecode.tsx
Error:   1:1  error  Definition for rule 'react/no-unknown-property' was not found  react/no-unknown-property

/home/runner/work/aSpiral/aSpiral/src/components/cinematics/ParticleExplosion.tsx
Error:   1:1  error  Definition for rule 'react/no-unknown-property' was not found  react/no-unknown-property

/home/runner/work/aSpiral/aSpiral/src/components/cinematics/PortalReveal.tsx
Error:   1:1  error  Definition for rule 'react/no-unknown-property' was not found  react/no-unknown-property

/home/runner/work/aSpiral/aSpiral/src/components/cinematics/SpaceWarp.tsx
Error:   1:1  error  Definition for rule 'react/no-unknown-property' was not found  react/no-unknown-property

/home/runner/work/aSpiral/aSpiral/src/components/cinematics/SpiralAscend.tsx
Error:   1:1  error  Definition for rule 'react/no-unknown-property' was not found  react/no-unknown-property

/home/runner/work/aSpiral/aSpiral/src/components/ui/badge.tsx
Warning:   29:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/home/runner/work/aSpiral/aSpiral/src/components/ui/button.tsx
Warning:   47:18  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/home/runner/work/aSpiral/aSpiral/src/components/ui/form.tsx
Warning:   129:10  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/home/runner/work/aSpiral/aSpiral/src/components/ui/navigation-menu.tsx
Warning:   111:3  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/home/runner/work/aSpiral/aSpiral/src/components/ui/sidebar.tsx
Warning:   636:3  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/home/runner/work/aSpiral/aSpiral/src/components/ui/sonner.tsx
Warning:   27:19  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/home/runner/work/aSpiral/aSpiral/src/components/ui/toggle.tsx
Warning:   37:18  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/home/runner/work/aSpiral/aSpiral/src/contexts/AuthContext.tsx
Warning:   30:14  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/home/runner/work/aSpiral/aSpiral/src/hooks/useSessionPersistence.ts
Warning:   223:6  warning  React Hook useEffect has missing dependencies: 'currentSession' and 'user'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

/home/runner/work/aSpiral/aSpiral/src/hooks/useTextToSpeech.ts
Warning:   192:6  warning  React Hook useCallback has missing dependencies: 'forceWebSpeech' and 'volume'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

/home/runner/work/aSpiral/aSpiral/src/lib/cinematics/ParticleSystem.tsx
Warning:   79:8  warning  React Hook useEffect has a missing dependency: 'updateInstancedMesh'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/home/runner/work/aSpiral/aSpiral/src/pages/AdminDashboard.tsx
  58:3  warning  Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-unused-vars')

/home/runner/work/aSpiral/aSpiral/src/pages/ApiKeys.tsx
Warning:   69:6  warning  React Hook useEffect has a missing dependency: 'loadApiKeys'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/home/runner/work/aSpiral/aSpiral/src/workers/renderer.worker.tsx
Warning:   28:10  warning  Fast refresh only works when a file has exports. Move your component(s) to a separate file  react-refresh/only-export-components
Warning:   41:10  warning  Fast refresh only works when a file has exports. Move your component(s) to a separate file  react-refresh/only-export-components

✖ 23 problems (6 errors, 17 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.

Error: Process completed with exit code 1.




=================================================================================================================================================================================================================================




src/components/cinematics/CinematicWrapper.tsx


Mark the props of the component as read-only.

Consistency
Maintainability


3
Low
react
type-dependent
+
Open
Not assigned
L14
5min effort
1 day ago
Code Smell
Minor


Do not use Array index in keys

Intentionality
Maintainability


2
Medium
jsx
performance
...
+
Open
Not assigned
L59
5min effort
1 day ago
Code Smell
Major
src/components/dashboard/EntityPieChart.tsx


Do not use Array index in keys

Intentionality
Maintainability


2
Medium
jsx
performance
...
+
Open
Not assigned
L37
5min effort
1 day ago
Code Smell
Major
src/hooks/useEntities.ts


Refactor this code to not nest functions more than 4 levels deep.

Adaptability
Maintainability


4
High
brain-overload
+
Open
Not assigned
L83
20min effort
1 day ago
Code Smell
Critical
src/lib/spatialLayout.ts


This assertion is unnecessary since it does not change the type of the expression.

Intentionality
Maintainability


3
Low
redundant
type-dependent
+
Open
Not assigned
L146
1min effort
1 day ago
Code Smell
Minor


This assertion is unnecessary since it does not change the type of the expression.

Intentionality
Maintainability


3
Low
redundant
type-dependent
+
Open
Not assigned
L149
1min effort
1 day ago
Code Smell
Minor
src/pages/AdminDashboard.tsx


`sessionIds` should be a `Set`, and use `sessionIds.has()` to check existence or non-existence.

Intentionality
Maintainability


2
Medium
optimization
performance
+
Open
Not assigned
L100
5min effort
1 day ago
Code Smell
Minor
supabase/.../generate-breakthrough/index.ts


Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.

Adaptability
Maintainability


4
High
brain-overload
+
Open
Not assigned
L19
6min effort
1 day ago
Code Smell
Critical
supabase/functions/spiral-ai/index.ts


Refactor this function to reduce its Cognitive Complexity from 25 to the 15 allowed.

Adaptability
Maintainability


4
High
brain-overload
+
Open
Not assigned
L114
15min effort
1 day ago
Code Smell
Critical
tests/chaos.test.ts


Prefer `globalThis` over `global`.

Consistency
Maintainability


3
Low
es2020
portability
+
Open
Not assigned
L106
2min effort
1 day ago
Code Smell
Minor


Prefer `globalThis` over `global`.

Consistency
Maintainability


3
Low
es2020
portability
+
Open
Not assigned
L108
2min effort
1 day ago
Code Smell
Minor


Prefer `globalThis` over `global`.

Consistency
Maintainability


3
Low
es2020
portability
+
Open
Not assigned
L108
2min effort
1 day ago
Code Smell
Minor


Prefer `globalThis` over `global`.

Consistency
Maintainability


3
Low
es2020
portability
+
Open
Not assigned
L108
2min effort
1 day ago
Code Smell
Minor


Prefer `globalThis` over `global`.

Consistency
Maintainability


3
Low
es2020
portability
+
Open
Not assigned
L109
2min effort
1 day ago
Code Smell
Minor


Prefer `globalThis` over `global`.

Consistency
Maintainability


3
Low
es2020
portability
+
Open
Not assigned
L110
2min effort
1 day ago
Code Smell
Minor


Prefer `globalThis` over `global`.

Consistency
Maintainability


3
Low
es2020
portability
+
Open
Not assigned
L111
2min effort
1 day ago
Code Smell
Minor


Prefer `globalThis` over `global`.

Consistency
Maintainability


3
Low
es2020
portability
+
Open
Not assigned
L200
2min effort
1 day ago
Code Smell
Minor