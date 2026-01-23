/**
 * lint-staged configuration
 *
 * Runs validation on staged files before commit to catch:
 * - TypeScript errors (missing imports, type mismatches)
 * - ESLint violations (including merge conflict markers)
 */
export default {
  // TypeScript files: run tsc for type checking, eslint for linting
  '*.{ts,tsx}': [
    // Type check the entire project (catches missing imports)
    () => 'tsc --noEmit',
    // Run ESLint with auto-fix (warnings allowed for react-refresh)
    'eslint --fix',
  ],

  // JavaScript files: just lint
  '*.{js,jsx}': [
    'eslint --fix',
  ],
};
