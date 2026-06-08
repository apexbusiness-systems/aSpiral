const fs = require('fs');
const file = 'src/contexts/AuthContext.tsx';
let code = fs.readFileSync(file, 'utf8');

const importRowType = `import type { Database } from '@/integrations/supabase/types';
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
`;

code = code.replace(
  "interface Profile {",
  importRowType + "\ninterface Profile {"
);

code = code.replace(
  `interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  tier: UserTier;
  created_at: string;
  updated_at: string;
}`,
  `interface Profile {
  id: string;
  display_name: ProfileRow['display_name'];
  avatar_url: ProfileRow['avatar_url'];
  tier: UserTier;
  created_at: ProfileRow['created_at'];
  updated_at: ProfileRow['updated_at'];
}`
);

fs.writeFileSync(file, code);
