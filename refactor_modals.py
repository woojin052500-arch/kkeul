import re

with open('src/components/MainFeed.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
if 'useTossModal' not in content:
    content = content.replace("import React, { useState, useMemo, useEffect, useCallback } from 'react';", "import React, { useState, useMemo, useEffect, useCallback } from 'react';\nimport { useTossModal } from '../hooks/useTossModal';")

# 2. Add hook call
if 'const { TossModal, showAlert, showPrompt } = useTossModal();' not in content:
    content = content.replace("export const MainFeed: React.FC<MainFeedProps> = ({", "export const MainFeed: React.FC<MainFeedProps> = ({\n")
    # Actually wait, the `{` opens the props destructuring. It ends at `}) => {`
    # Let's just find `}) => {` and replace it with `}) => {\n  const { TossModal, showAlert, showPrompt } = useTossModal();\n`
    content = re.sub(r'(\}\) => \{)', r'\1\n  const { TossModal, showAlert, showPrompt } = useTossModal();\n', content, count=1)

# 3. Replace alert and prompt
content = re.sub(r'\balert\(', 'await showAlert(', content)
content = re.sub(r'\bwindow\.alert\(', 'await showAlert(', content)
content = re.sub(r'\bwindow\.prompt\(', 'await showPrompt(', content)
content = re.sub(r'\bprompt\(', 'await showPrompt(', content)

# 4. Add <TossModal /> at the end
# The component ends with `    </div>\n  );\n};` or similar. Let's find the last `</div>` before `);`
if '<TossModal />' not in content:
    # A safer way: find `);` right before the end of the file.
    # But it's easier to just do:
    parts = content.rsplit('</div>', 1)
    if len(parts) == 2:
        content = parts[0] + '  <TossModal />\n    </div>' + parts[1]

with open('src/components/MainFeed.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactored alerts and prompts!")
