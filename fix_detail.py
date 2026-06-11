import re

with open('src/components/DetailView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'\{profile\?\.skills\?\.techStack.*?\'Figma, VS Code, Git\'\}', 'Figma, VS Code, Git', text, flags=re.DOTALL)

text = re.sub(r'\{profile\?\.experiences\?\.awards.*?\'교내 정보올림피아드 \(최우수상\)\'\}', '교내 정보올림피아드 (최우수상)', text, flags=re.DOTALL)

intro_old = r'\"저는 \{profile\?\.skills\?\.techStack\?\.\[0\] \|\| \'개발/디자인\'\} 스택을 다룰 수 있는 청소년입니다\. \{profile\?\.experiences\?\.awards\?\.\[0\]\?\.contestName \|\| \'교내 대회\'\} 등에서 수상하며 협업과 문제 해결 능력을 검증받았으며, 향후 \{profile\?\.goals\?\.\[0\] \|\| \'해당 대외활동\'\}에서 성과를 내기 위해 지원합니다\.\"'
intro_new = '\"저는 기획/개발/디자인 스택을 다룰 수 있는 청소년입니다. 교내 대회 등에서 수상하며 협업과 문제 해결 능력을 검증받았으며, 향후 프로젝트에서 성과를 내기 위해 지원합니다.\"'
text = re.sub(intro_old, intro_new, text)

with open('src/components/DetailView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
