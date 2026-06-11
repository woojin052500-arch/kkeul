import re

with open('transcript_extract.txt', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

text = text.replace('\\n', '\n')
text = text.replace('\\"', '"')
text = re.sub(r'^\d{1,4}:\s?', '', text, flags=re.MULTILINE)

with open('transcript_extract.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Success')
