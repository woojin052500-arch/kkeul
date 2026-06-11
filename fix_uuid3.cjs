const fs = require('fs');
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const findStr = "// 모의 계정(id가 'u'로 시작)이면 초기화하지 않고 리턴\n            if (prof && prof.id && prof.id.startsWith('u')) {\n              return;\n            }";

const replaceStr = `// 모의 계정(id가 'u'로 시작하거나 로컬 계정 목록에 있는 경우)이면 초기화하지 않고 리턴
            const mockAccounts = JSON.parse(localStorage.getItem('kkeul_mock_accounts') || '[]');
            const isMock = mockAccounts.some((acc) => acc.email === prof.email);
            if (isMock || (prof && prof.id && prof.id.startsWith('u'))) {
              return;
            }`;

appCode = appCode.replace(findStr, replaceStr);
fs.writeFileSync('src/App.tsx', appCode);
console.log('done3');
