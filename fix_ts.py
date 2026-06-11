import re

with open('src/components/Onboarding.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('<PremiumLogo size={80}', '<PremiumLogo size="lg"')
text = text.replace('PlusCircle, ', '')
text = re.sub(r'\n  const \[activeDetailTerm, setActiveDetailTerm\] = useState.*?;', '', text)
text = re.sub(r'\n  const locations = \[.*?\];', '', text, flags=re.DOTALL)
text = re.sub(r'\n  const grades = \[.*?\];', '', text, flags=re.DOTALL)
text = re.sub(r'\n  const interestOptions = \[.*?\];', '', text, flags=re.DOTALL)
text = re.sub(r'\n  const toggleInterest = .*?};\n', '', text, flags=re.DOTALL)
text = re.sub(r'\n  const isAllAgreed = .*?;', '', text)
text = re.sub(r'\n  const isRequiredAgreed = .*?;', '', text)

with open('src/components/Onboarding.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Fixed unused variables and PremiumLogo size!')
