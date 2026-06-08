const fs = require('fs');
const file = 'src/contexts/AuthContext.tsx';
let code = fs.readFileSync(file, 'utf8');

// Update Profile interface to use Database types
const importRowType = `import type { Database } from '@/integrations/supabase/types';
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
`;

code = code.replace(
  "export interface Profile {",
  importRowType + "\nexport interface Profile {"
);

code = code.replace(
  `export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  tier: UserTier;
  created_at: string;
  updated_at: string;
}`,
  `export interface Profile {
  id: string;
  display_name: ProfileRow['display_name'];
  avatar_url: ProfileRow['avatar_url'];
  tier: UserTier;
  created_at: ProfileRow['created_at'];
  updated_at: ProfileRow['updated_at'];
}`
);

// Remove (supabase as any) casts
code = code.replace(
  /const \{ data, error \} = await \(supabase as any\)/g,
  `const { data, error } = await supabase`
);

code = code.replace(
  /const \{ error \} = await \(supabase as any\)/g,
  `const { error } = await supabase`
);

fs.writeFileSync(file, code);
