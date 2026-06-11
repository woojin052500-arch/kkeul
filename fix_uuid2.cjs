const fs = require('fs');
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const findStr = "const parsedProfile = JSON.parse(savedProfile) as Profile;";
const replaceStr = `const parsedProfile = JSON.parse(savedProfile) as Profile;
          // Migrate old mock IDs to UUID format to prevent Supabase 400 Bad Request
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (parsedProfile && parsedProfile.id && !uuidRegex.test(parsedProfile.id)) {
            parsedProfile.id = crypto.randomUUID();
            localStorage.setItem('kkeul_profile', JSON.stringify(parsedProfile));
          }`;

appCode = appCode.replace(findStr, replaceStr);
fs.writeFileSync('src/App.tsx', appCode);
console.log('done2');
