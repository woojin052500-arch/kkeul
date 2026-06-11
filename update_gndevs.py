import re

with open('src/components/MainFeed.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add GNDevs import
if 'partnerGNDevs' not in text:
    text = text.replace("import partnerScentpulse from '../assets/partner_scentpulse.png';",
                        "import partnerScentpulse from '../assets/partner_scentpulse.png';\nimport partnerGNDevs from '../assets/partner_gndevs.svg';")

# 2. Insert Gangnam Developers
gndevs_html = '''
              {/* 강남디벨로퍼스 */}
              <a href="https://www.gangnamdev.com/" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', border: '1px solid #F0F0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, background: '#FFFFFF' }}>
                  <img src={partnerGNDevs} alt="강남디벨로퍼스" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>강남디벨로퍼스</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>협력사</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>글로벌 HR 전문기업 및 맞춤형 IT 솔루션 구축 파트너</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['솔루션', 'IT컨설팅', 'HR'].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}
                  </div>
                </div>
              </a>
'''

text = text.replace('{/* Wellthy Korea */}', gndevs_html + '\n              {/* Wellthy Korea */}')

with open('src/components/MainFeed.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
