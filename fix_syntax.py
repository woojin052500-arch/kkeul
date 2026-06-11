import re

with open('src/components/Onboarding.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# I need to find the `return (` that starts the JSX tree.
# Currently it is at:
#     }
#     return (
#     <div style={{ 

# I will replace it with:
replacement = """    }
    return () => {
      if (backRef) {
        backRef.current = null;
      }
    };
  }, [step, mode, backRef]);

  // Progress Bar Helper
  const getProgressPercent = () => {
    if (step === 0 || mode === 'login') return 0;
    let total = 9; // email, password, name, agreements, role, region, grade, school, interests
    let current = step;
    
    if (step >= 10) {
      // Host steps: 10 (institution), 11 (contact), 12 (done)
      total = 3;
      current = step - 9;
    } else if (step === 13 || step === 14) {
      // Student extra steps
      total = 11;
      current = step;
    }
    
    return Math.min(100, Math.round((current / total) * 100));
  };

  return ("""

fixed = text.replace("    }\n    return (\n    <div style={{ \n", replacement + "\n    <div style={{ \n")

with open('src/components/Onboarding.tsx', 'w', encoding='utf-8') as f:
    f.write(fixed)

print("Syntax error fixed!")
