const ts = require('typescript');
const fs = require('fs');

const code = fs.readFileSync('src/components/Onboarding.tsx', 'utf8');
const sourceFile = ts.createSourceFile('Onboarding.tsx', code, ts.ScriptTarget.Latest, true);

const parseDiagnostics = sourceFile.parseDiagnostics;
if (parseDiagnostics.length > 0) {
    parseDiagnostics.forEach(d => {
        const pos = sourceFile.getLineAndCharacterOfPosition(d.start);
        console.log(`Error at ${pos.line + 1}:${pos.character + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, '\\n')}`);
    });
} else {
    console.log("No syntax errors found by parseDiagnostics!");
}
