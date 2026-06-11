const fs = require('fs');
let scCode = fs.readFileSync('src/supabaseClient.ts', 'utf8');

scCode = scCode.replace(
  /return \{ user: null, error: err \};\n    \};\n    \}/g,
  "return { user: null, error: err };\n    }"
);

fs.writeFileSync('src/supabaseClient.ts', scCode);
console.log('done_fix_syntax');
