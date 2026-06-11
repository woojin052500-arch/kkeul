import sys

with open('src/components/Onboarding.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines[320:345]):
    print(f"{i+320}: {line.rstrip()}")
