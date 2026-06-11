const fs = require('fs');

let content = fs.readFileSync('src/supabaseClient.ts', 'utf8');

// We will manually replace the catch blocks for signUp and signIn

// signUp catch block replacement
let signUpCatchRegex = /catch \([^\)]+\) \{\s*console\.warn\('Supabase Auth SignUp[^]*?error: null \};\s*\}/;
let signUpCatchReplacement = `catch (err: any) {
      console.error('Supabase Auth SignUp Error:', err);
      return { user: null, error: err };
    }`;
content = content.replace(signUpCatchRegex, signUpCatchReplacement);

// signIn catch block replacement
let signInCatchRegex = /catch \([^\)]+\) \{\s*console\.warn\('Supabase Auth SignIn[^]*?error: \{ message: [^]*?\}\s*\}/;
let signInCatchReplacement = `catch (err: any) {
      console.error('Supabase Auth SignIn Error:', err);
      return { user: null, error: err };
    }`;
content = content.replace(signInCatchRegex, signInCatchReplacement);

fs.writeFileSync('src/supabaseClient.ts', content);
console.log('done_auth_fix');
