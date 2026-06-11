import re

with open('src/components/MainFeed.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# We need to extract the blocks between {/* BSBRBO */} and before the next section
# The bounds are:
start_str = "{/* BSBRBO */}"
end_str = "              {/* 아트웍 CTA (데스크탑 미사용) */}"

start_idx = text.find(start_str)
end_idx = text.find(end_str)

if start_idx != -1 and end_idx != -1:
    section_text = text[start_idx:end_idx]

    patterns = {
        'Gangnam': r'(\{\/\*\s*강남디벨로퍼스\s*\*\/\}.*?)(?=\{\/\*|\Z)',
        'Wellthy': r'(\{\/\*\s*Wellthy Korea\s*\*\/\}.*?)(?=\{\/\*|\Z)',
        'Scent': r'(\{\/\*\s*Scent Pulse\s*\*\/\}.*?)(?=\{\/\*|\Z)',
        'StudentRoom': r'(\{\/\*\s*학생 능력자들의 방\s*\*\/\}.*?)(?=\{\/\*|\Z)',
        'Brawl': r'(\{\/\*\s*브롤 커뮤니티 방\s*\*\/\}.*?)(?=\{\/\*|\Z)',
        'KangCEO': r'(\{\/\*\s*강대표님\s*\*\/\}.*?)(?=\{\/\*|\Z)',
        'BSBRBO': r'(\{\/\*\s*BSBRBO\s*\*\/\}.*?)(?=\{\/\*|\Z)',
        'Switchback': r'(\{\/\*\s*SWITCHBACK\s*\*\/\}.*?)(?=\{\/\*|\Z)',
        'Bugil': r'(\{\/\*\s*북일고등학교 총학생회\s*\*\/\}.*?)(?=\{\/\*|\Z)',
    }

    blocks = {}
    for key, regex in patterns.items():
        match = re.search(regex, section_text, re.DOTALL)
        if match:
            blocks[key] = match.group(1).strip()
            
    priority_order = [
        'Gangnam', 'Wellthy', 'Scent', 'KangCEO', 'BSBRBO', 'StudentRoom', 'Brawl', 'Switchback', 'Bugil'
    ]

    if len(blocks) == 9:
        new_section = ""
        for k in priority_order:
            new_section += '              {/* ' + k + ' */}\n'
            # The comments inside the block might be duplicated, so let's strip the first line if it's a comment
            block_lines = blocks[k].split('\n')
            if block_lines[0].startswith('{/*'):
                block_content = '\n'.join(block_lines[1:]).strip()
            else:
                block_content = blocks[k]
            new_section += '              ' + block_content.replace('\n', '\n              ') + '\n\n'

        new_text = text[:start_idx] + new_section + text[end_idx:]

        with open('src/components/MainFeed.tsx', 'w', encoding='utf-8') as f:
            f.write(new_text)
        print("Success")
    else:
        print("Failed to extract all 9 blocks:", len(blocks))
else:
    print("Failed to find bounds")
