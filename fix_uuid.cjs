const fs = require('fs');

// 1. Update Onboarding.tsx
let obCode = fs.readFileSync('src/components/Onboarding.tsx', 'utf8');
obCode = obCode.replace(
  /id: userProfile\?\.id \|\| 'u' \+ Math\.random\(\)\.toString\(36\)\.substring\(2, 11\) \+ '-' \+ Date\.now\(\)\.toString\(36\),/g,
  "id: userProfile?.id || crypto.randomUUID(),"
);
fs.writeFileSync('src/components/Onboarding.tsx', obCode);

// 2. Update supabaseClient.ts
let scCode = fs.readFileSync('src/supabaseClient.ts', 'utf8');
scCode = scCode.replace(
  /const newUserId = 'u' \+ Math\.random\(\)\.toString\(36\)\.substring\(2, 11\) \+ '-' \+ Date\.now\(\)\.toString\(36\);/g,
  "const newUserId = crypto.randomUUID();"
);
fs.writeFileSync('src/supabaseClient.ts', scCode);

// 3. Update App.tsx to migrate old mock profiles
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
const findStr = "const prof = JSON.parse(savedProfile);";
const replaceStr = `const prof = JSON.parse(savedProfile);
            // Migrate old mock IDs to UUID format to prevent Supabase 400 Bad Request
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (prof && prof.id && !uuidRegex.test(prof.id)) {
              prof.id = crypto.randomUUID();
              localStorage.setItem('kkeul_profile', JSON.stringify(prof));
            }`;
appCode = appCode.replace(findStr, replaceStr);

fs.writeFileSync('src/App.tsx', appCode);
console.log('done');
