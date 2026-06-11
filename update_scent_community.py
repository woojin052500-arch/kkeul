import re

with open('src/components/MainFeed.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add Scentpulse import
if 'partnerScentpulse' not in text:
    text = text.replace("import partnerWellthy from '../assets/partner_wellthy.png';",
                        "import partnerWellthy from '../assets/partner_wellthy.png';\nimport partnerScentpulse from '../assets/partner_scentpulse.png';")

# 2. Update Scent Pulse Image
img_old = '<img src="https://logo.clearbit.com/scent-pulse.com" onError={(e) => { e.currentTarget.src = \'https://ui-avatars.com/api/?name=Scent+Pulse&background=F2F4F6&color=191F28\'; }} alt="Scent Pulse" style={{ width: \'90%\', height: \'90%\', objectFit: \'contain\' }} />'
img_new = '<img src={partnerScentpulse} alt="Scent Pulse" style={{ width: \'90%\', height: \'90%\', objectFit: \'contain\' }} />'
text = text.replace(img_old, img_new)

# 3. Update '내 커뮤니티' to '학생 능력자들의 방'
text = text.replace('>내 커뮤니티</span>', '>학생 능력자들의 방</span>')
# There's also a comment {/* 내 커뮤니티 */}
text = text.replace('{/* 내 커뮤니티 */}', '{/* 학생 능력자들의 방 */}')

with open('src/components/MainFeed.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
