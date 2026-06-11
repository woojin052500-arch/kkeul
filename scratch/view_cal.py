import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='ignore')

with open('src/components/MainFeed.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_cal = False
for i, line in enumerate(lines):
    if "activeTab === 'calendar'" in line:
        in_cal = True
    if in_cal:
        print(f'{i+1}: {line.rstrip()}')
        if i > 0 and "activeTab === 'bookmarks'" in line:
            break
