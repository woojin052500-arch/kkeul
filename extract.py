import json
import re

with open(r'C:\Users\USER\.gemini\antigravity\brain\304bd663-3ae8-462f-8b65-3d917559e999\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8', errors='replace') as f:
    text = f.read()

idx = text.find('462:         )}')
if idx != -1:
    end_idx = text.find('1261:                   <li>제4조', idx)
    if end_idx != -1:
        extracted = text[idx:end_idx + 100]
        extracted = extracted.replace('\\\\n', '\\n').replace('\\"', '"')
        # Remove line numbers
        cleaned = re.sub(r'^\d{1,4}:\s', '', extracted, flags=re.MULTILINE)
        
        with open('transcript_extract.txt', 'w', encoding='utf-8') as outf:
            outf.write(cleaned)
        print('Extracted!')
    else:
        print('End not found')
else:
    print('Start not found')
