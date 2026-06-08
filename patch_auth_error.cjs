const fs = require('fs');
const file = 'src/contexts/AuthContext.tsx';
let code = fs.readFileSync(file, 'utf8');

const errorNormalizer = `
/**
 * Normalizes Supabase SDK errors and raw network exceptions into a consistent
 * { error } shape. Handles the case where TypeError: Failed to fetch propagates
 * as a raw exception rather than a Supabase error object.
 */
function normalizeAuthError(err: unknown): Error {
  if (err instanceof Error) {
    // Detect network/connectivity failures
    if (
      err.message.includes('Failed to fetch') ||
      err.message.includes('NetworkError') ||
      err.message.includes('network request failed') ||
      err.message.includes('ERR_NAME_NOT_RESOLVED')
    ) {
      return new Error('NETWORK_ERROR: Cannot connect to authentication server. Please check your internet connection.');
    }
    return err;
  }
  return new Error(String(err));
}
`;

// Insert after imports (find the first empty line after imports or at a specific line if needed)
// Let's insert it before `export interface User`
code = code.replace("export interface User {", errorNormalizer + "\nexport interface User {");

// Replace catch blocks in AuthContext.tsx
code = code.replace(
  /\n(\s*)\} catch \(err: any\) \{\n\s*return \{ error: err \};\n\s*\}/g,
  `\n$1} catch (err) {\n$1  return { error: normalizeAuthError(err) };\n$1}`
);

fs.writeFileSync(file, code);
