import re

with open('src/components/MainFeed.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add Wellthy import
if 'partnerWellthy' not in text:
    text = text.replace("import partnerBrawl from '../assets/partner_brawl.png';",
                        "import partnerBrawl from '../assets/partner_brawl.png';\nimport partnerWellthy from '../assets/partner_wellthy.png';")

if 'Users' not in text.split('lucide-react')[0]:
    text = text.replace('User, Star', 'Users, User, Star')

# 2. Modify BSBRBO
bsbrbo_old = '<div className="spring-active" style={{ background: \'#FFFFFF\', borderRadius: \'20px\', padding: \'18px\', border: \'1px solid #F0F0F5\', boxShadow: \'0 2px 12px rgba(0,0,0,0.04)\', display: \'flex\', alignItems: \'center\', gap: \'16px\', cursor: \'pointer\', transition: \'all 0.2s ease\' }}>\n                <div style={{ width: \'64px\', height: \'64px\', borderRadius: \'16px\', overflow: \'hidden\', flexShrink: 0, border: \'1px solid #F0F0F5\' }}>\n                  <img src={partnerBsbrbo}'
bsbrbo_new = '<a href="https://open.kakao.com/o/gBXNKfEh" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: \'none\', color: \'inherit\', background: \'#FFFFFF\', borderRadius: \'20px\', padding: \'18px\', border: \'1px solid #F0F0F5\', boxShadow: \'0 2px 12px rgba(0,0,0,0.04)\', display: \'flex\', alignItems: \'center\', gap: \'16px\', cursor: \'pointer\', transition: \'all 0.2s ease\' }}>\n                <div style={{ width: \'64px\', height: \'64px\', borderRadius: \'16px\', overflow: \'hidden\', flexShrink: 0, border: \'1px solid #F0F0F5\' }}>\n                  <img src={partnerBsbrbo}'
text = text.replace(bsbrbo_old, bsbrbo_new)
text = text.replace('        </div>\n\n              {/* 강대표님 */}', '        </a>\n\n              {/* 강대표님 */}')

# 3. Modify Kangceo
kang_old = '<div className="spring-active" style={{ background: \'#FFFFFF\', borderRadius: \'20px\', padding: \'18px\', border: \'1px solid #F0F0F5\', boxShadow: \'0 2px 12px rgba(0,0,0,0.04)\', display: \'flex\', alignItems: \'center\', gap: \'16px\', cursor: \'pointer\', transition: \'all 0.2s ease\' }}>\n                <div style={{ position: \'relative\', flexShrink: 0, width: \'64px\', height: \'64px\' }}>'
kang_new = '<a href="https://www.instagram.com/kangceo_official/" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: \'none\', color: \'inherit\', background: \'#FFFFFF\', borderRadius: \'20px\', padding: \'18px\', border: \'1px solid #F0F0F5\', boxShadow: \'0 2px 12px rgba(0,0,0,0.04)\', display: \'flex\', alignItems: \'center\', gap: \'16px\', cursor: \'pointer\', transition: \'all 0.2s ease\' }}>\n                <div style={{ position: \'relative\', flexShrink: 0, width: \'64px\', height: \'64px\' }}>'
text = text.replace(kang_old, kang_new)
text = text.replace('      </div>\n\n              {/* SWITCHBACK */}', '      </a>\n\n              {/* SWITCHBACK */}')

# 4. Modify Brawl
brawl_old = '<div style={{ display: \'flex\', alignItems: \'flex-start\', gap: \'14px\', background: \'#FFFFFF\', padding: \'16px\', borderRadius: \'16px\', boxShadow: \'0 2px 10px rgba(0,0,0,0.02)\' }}>\n                <div style={{ width: \'48px\', height: \'48px\', borderRadius: \'12px\', overflow: \'hidden\', background: \'#F2F4F6\', flexShrink: 0, display: \'flex\', alignItems: \'center\', justifyContent: \'center\' }}>'
brawl_new = '<a href="https://open.kakao.com/o/pKJ0jdxi" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: \'none\', color: \'inherit\', display: \'flex\', alignItems: \'flex-start\', gap: \'14px\', background: \'#FFFFFF\', padding: \'16px\', borderRadius: \'16px\', boxShadow: \'0 2px 10px rgba(0,0,0,0.02)\' }}>\n                <div style={{ width: \'48px\', height: \'48px\', borderRadius: \'12px\', overflow: \'hidden\', background: \'#F2F4F6\', flexShrink: 0, display: \'flex\', alignItems: \'center\', justifyContent: \'center\' }}>'
text = text.replace(brawl_old, brawl_new)
text = text.replace('              </div>\n\n            </div>\n          </div>\n\n          {/* Bottom margin', '              </a>\n\n            </div>\n          </div>\n\n          {/* Bottom margin')

# 5. Insert New Partners
new_partners = '''
              {/* Wellthy Korea */}
              <a href="https://www.wellthykorea.kr/" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', border: '1px solid #F0F0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, background: '#FFFFFF' }}>
                  <img src={partnerWellthy} alt="Wellthy Korea" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>Wellthy Korea</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>협력사</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>미래 자산 관리 파트너</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['웰스', '자산', '청소년금융'].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}
                  </div>
                </div>
              </a>

              {/* Scent Pulse */}
              <a href="https://www.scent-pulse.com/" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', border: '1px solid #F0F0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, background: '#FFFFFF' }}>
                  <img src="https://logo.clearbit.com/scent-pulse.com" onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=Scent+Pulse&background=F2F4F6&color=191F28'; }} alt="Scent Pulse" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>Scent Pulse</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#F97316', background: 'rgba(249,115,22,0.1)', borderRadius: '6px', padding: '3px 6px' }}>협력 서비스</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>향기 기반 라이프스타일 큐레이션</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['라이프', '향기', '서비스'].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}
                  </div>
                </div>
              </a>

              {/* 내 커뮤니티 */}
              <a href="https://open.kakao.com/o/gzJLwdxi" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'flex-start', gap: '14px', background: '#FFFFFF', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', background: '#F2F4F6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#191F28' }}>
                  <Users size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>내 커뮤니티</span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#8B5CF6', background: 'rgba(139,92,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>커뮤니티</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>네트워킹 및 소통 공간</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['소통', '네트워킹'].map(t => (
                      <span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#8B5CF6', background: 'rgba(139,92,246,0.08)', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>
                    ))}
                  </div>
                </div>
              </a>
'''

text = text.replace('{/* 브롤 커뮤니티 방 */}', new_partners + '\n              {/* 브롤 커뮤니티 방 */}')

with open('src/components/MainFeed.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
