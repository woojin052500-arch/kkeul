const fs = require('fs');
let obCode = fs.readFileSync('src/components/Onboarding.tsx', 'utf8');

obCode = obCode.replace(
  /const \{ error \} = await db\.signIn\(email, password\);/,
  "const { user, error } = await db.signIn(email, password);"
);

obCode = obCode.replace(
  /id: userProfile\?\.id \|\| crypto\.randomUUID\(\),/,
  "id: userProfile?.id || user?.id || crypto.randomUUID(),"
);

fs.writeFileSync('src/components/Onboarding.tsx', obCode);
console.log('done_ob');
