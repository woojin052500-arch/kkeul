const fs = require('fs');
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const findStr = "if (session && session.user && session.user.email) {\n            const userProfile = await db.getProfile(session.user.email);\n            if (userProfile) {\n              setProfile(userProfile);\n              localStorage.setItem('kkeul_profile', JSON.stringify(userProfile));";

const replaceStr = `if (session && session.user && session.user.email) {
            const userProfile = await db.getProfile(session.user.email);
            if (userProfile) {
              // Auto-heal: Ensure profile ID matches REAL Supabase Auth UUID!
              if (userProfile.id !== session.user.id) {
                userProfile.id = session.user.id;
                db.saveProfile(userProfile);
              }
              setProfile(userProfile);
              localStorage.setItem('kkeul_profile', JSON.stringify(userProfile));`;

if (appCode.includes(findStr)) {
  appCode = appCode.replace(findStr, replaceStr);
  fs.writeFileSync('src/App.tsx', appCode);
  console.log('done_heal');
} else {
  console.log('findStr not found!');
}
