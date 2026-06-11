const fs = require('fs');
let code = fs.readFileSync('src/components/MainFeed.tsx', 'utf8');
let lines = code.split('\n');

// 1. insert sessionSwipes
lines.splice(95, 0, '  const [sessionSwipes, setSessionSwipes] = useState<number>(0);');

// 2. modify handleDragEnd
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("if (card.category === 'AD') {") && lines[i+2].includes("setPassedIds")) {
    lines[i+2] = "        setPassedIds(prev => [...prev, card.id]);\n        setSessionSwipes(prev => prev + 1);";
    let j = i + 3;
    let braceCount = 1;
    while (j < lines.length) {
      if (lines[j].includes('{')) braceCount++;
      if (lines[j].includes('}')) braceCount--;
      if (braceCount === 0) {
        lines.splice(j, 0, '        setSessionSwipes(prev => prev + 1);');
        break;
      }
      j++;
    }
    break;
  }
}

// 3. modify executeSwipeAction
let foundExecute = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const executeSwipeAction = async")) {
    foundExecute = true;
  }
  if (foundExecute && lines[i].includes("await db.recordUserAction(profile.id, profile.email, card.id, actionType);")) {
    lines[i] = "    if (card.category === 'AD') {\n      setPassedIds(prev => [...prev, card.id]);\n      setSessionSwipes(prev => prev + 1);\n    } else {\n      await db.recordUserAction(profile.id, profile.email, card.id, actionType);";
    let j = i + 1;
    while(j < lines.length) {
      if (lines[j].includes("setTimeout(() => {")) {
        lines.splice(j, 0, "      setSessionSwipes(prev => prev + 1);\n    }");
        break;
      }
      j++;
    }
    break;
  }
}

// 4. replace swipesDone definition
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const swipesDone = bookmarks.length + passedIds.length;")) {
    lines[i] = lines[i].replace("bookmarks.length + passedIds.length", "sessionSwipes");
  }
}

fs.writeFileSync('src/components/MainFeed.tsx', lines.join('\n'));
