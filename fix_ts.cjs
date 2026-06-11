const fs = require('fs');
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const findStr = "const isMock = mockAccounts.some((acc) => acc.email === prof.email);";
const replaceStr = "const isMock = mockAccounts.some((acc: any) => acc.email === prof.email);";

appCode = appCode.replace(findStr, replaceStr);
fs.writeFileSync('src/App.tsx', appCode);
console.log('done_ts');
