import { createClient } from '@supabase/supabase-js';
import type { Announcement, Profile, TeamPost, JoinRequest, ClubAnnouncement, ClubApplicant } from './types';

const SUPABASE_URL = 'https://mzhwbygibrymzjaavyuu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16aHdieWdpYnJ5bXpqYWF2eXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzkwNDUsImV4cCI6MjA5NDg1NTA0NX0.QV5O1ciBRPGGT6c6eubBaB2Nb2eBK01QFEZLsaaDBL0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 로컬 모의 공고 데이터 (씨드 데이터)
const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    title: '넥슨 청소년 프로그래밍 챌린지 2026 (NYPC)',
    host: '넥슨재단',
    category: 'IT/개발',
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '넥슨의 대표 게임 IP를 활용해 창의적인 문제 해결 능력을 평가하는 청소년 전략 코딩 대회입니다. 12세부터 19세 청소년 누구나 참여 가능하며 본선은 판교 넥슨 사옥에서 개최됩니다.',
    image_url: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.nypc.co.kr',
    bid_amount: 15000
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    title: '제43회 한국정보올림피아드 경시부문 (KOI 2026)',
    host: '한국정보과학회',
    category: 'IT/개발',
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '국내 최고의 권위를 자랑하는 컴퓨터 알고리즘 프로그래밍 대회입니다. 우수 학생들은 국제정보올림피아드(IOI) 대한민국 대표 후보 자격을 획득하게 됩니다.',
    image_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://koi.or.kr',
    bid_amount: 10000
  },
  {
    id: 'a3333333-3333-3333-3333-333333333333',
    title: '삼성 주니어 SW 창작대회 2026',
    host: '삼성전자',
    category: 'IT/개발',
    deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '소프트웨어로 만드는 더 나은 미래를 주제로, 생활 속 문제점을 발견하고 이를 해결할 창의적인 아이디어를 코딩으로 구현하는 해커톤 및 창작대회입니다. 삼성전자 임직원 멘토링이 무료 지원됩니다.',
    image_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.juniorswcup.com',
    bid_amount: 8000
  },
  {
    id: 'a4444444-4444-4444-4444-444444444444',
    title: '제15회 한국청소년학술대회 (KSCY 2026)',
    host: 'KSCY 조직위원회 (연세대학교)',
    category: '인문학',
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    location: '서울',
    details: '아시아 최대 청소년 학술 컨퍼런스로, 인문학, 사회과학, 자연과학 등 본인만의 연구 학술 논문 또는 연구 계획안을 발표하는 청소년 학술 교류 대회입니다.',
    image_url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://kscy.org',
    bid_amount: 5000
  },
  {
    id: 'a5555555-5555-5555-5555-555555555555',
    title: '2026 대한민국 학생창의력 챔피언대회',
    host: '특허청, 한국발명진흥회',
    category: '창업',
    deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '팀 단위로 참여하여 표현과제 및 즉석과제, 제작과제를 통해 창의적인 문제 해결력을 평가하고 협업 능력을 기르는 국내 최대 학생 발명 창의 대회입니다.',
    image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.ip-edu.net',
    bid_amount: 3000
  },
  {
    id: 'a6666666-6666-6666-6666-666666666666',
    title: '2026 YIP 청소년 발명가 프로그램',
    host: '특허청',
    category: '창업',
    deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '중·고등학생 대상의 아이디어 구체화 및 지식재산(특허) 출원 지원 교육 공모전입니다. 변리사 등 전문가 멘토링이 무료로 제공됩니다.',
    image_url: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.ip-edu.net/yip',
    bid_amount: 2000
  },
  {
    id: 'a7777777-7777-7777-7777-777777777777',
    title: '제26회 대한민국 독서토론·논술대회',
    host: '전국독서새물결모임',
    category: '문학/수기',
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    location: '강원',
    details: '초·중·고등학생 대상의 전국 단위 독서 및 토론, 논술 경진대회로 인문 사회적 소양과 논리력을 겨룹니다.',
    image_url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.read365.eduniety.net',
    bid_amount: 0
  },
  {
    id: 'a8888888-8888-8888-8888-888888888888',
    title: '한국 과학영재 과학전람회 (KSEF 2026)',
    host: '한국과학기술지원단',
    category: '수학/과학',
    deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '청소년들이 수학, 물리, 화학, 지구과학, 환경 등 다양한 분야의 과학 프로젝트를 탐구하고 발표하는 최고 권위의 과학 연구 발표 대회입니다.',
    image_url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.ksef.or.kr',
    bid_amount: 0
  },
  {
    id: 'a9999999-9999-9999-9999-999999999999',
    title: 'LG 생활건강 청소년 기후활동가 공모전',
    host: 'LG생활건강',
    category: '봉사활동',
    deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    location: '경기',
    details: '지역 사회의 기후 환경 문제를 고민하고 직접 실천할 수 있는 환경 보호 기후 행동 아이디어 및 캠페인 공모전입니다.',
    image_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.lghnh.com',
    bid_amount: 0
  },
  {
    id: 'a1010101-1010-1010-1010-101010101010',
    title: '전국 청소년 영어 토론 대회 (YDT 2026)',
    host: '한국영어교육평가원',
    category: '외국어/어학',
    deadline: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    location: '서울',
    details: '전국 중고등학생 대상 의회식 영어 토론 대회로, 글로벌 이슈에 대한 논리적 주장 전개와 영작/스피치 역량을 종합 평가합니다.',
    image_url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.ydt.or.kr',
    bid_amount: 0
  },
  {
    id: 'a1111111-1111-1111-1111-222222222222',
    title: '제18회 한국 코드페어 (Korea Code Fair)',
    host: '과학기술정보통신부',
    category: 'IT/개발',
    deadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '우리 주변의 사회 문제를 해결하는 소프트웨어 소프트웨어 공모전 및 해커톤 대회로 주니어 SW인재를 발굴합니다.',
    image_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://kocodefair.kr',
    bid_amount: 12000
  },
  {
    id: 'a1222222-2222-2222-2222-333333333333',
    title: '한화 사이언스 챌린지 2026 (Hanwha Science Challenge)',
    host: '한화그룹',
    category: '수학/과학',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '지구 구조(Saving the Earth)를 주제로 하는 고등학생 대상의 기초과학 탐구 공모전으로, 총 상금 2억원 규모의 권위있는 과학 공모전입니다.',
    image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.sciencechallenge.or.kr',
    bid_amount: 9000
  },
  {
    id: 'a1333333-3333-3333-3333-444444444444',
    title: '제28회 전국 학생 통계활용대회',
    host: '통계청',
    category: '수학/과학',
    deadline: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '통계 포스터 작성을 통해 문제 해결력을 함양하는 수학/과학 공모전입니다. 초중고등학생의 통계 리터러시를 겨룹니다.',
    image_url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.statcontest.or.kr',
    bid_amount: 0
  },
  {
    id: 'a1444444-4444-4444-4444-555555555555',
    title: '제24회 대한민국 청소년 영화제 (KYFF)',
    host: '한국청소년영상예술진흥원',
    category: '미디어/영상',
    deadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString(),
    location: '경기',
    details: '미래의 영상 인재들을 위한 최대 청소년 영화제입니다. 중·고등학생 및 대학생 연령대의 청소년이 직접 연출하고 촬영한 단편 영화를 공모합니다.',
    image_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.kyff.com',
    bid_amount: 0
  },
  {
    id: 'a1555555-5555-5555-5555-666666666666',
    title: '제47회 전국 학생 과학발명품경진대회',
    host: '국립중앙과학관',
    category: '수학/과학',
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '청소년들이 창의적인 발명 아이디어를 구체적인 작품으로 제작하여 발명 역량과 문제 해결력을 키울 수 있도록 지원하는 최고 권위 발명 공모전입니다.',
    image_url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.science.go.kr',
    bid_amount: 0
  },
  {
    id: 'a1666666-6666-6666-6666-777777777777',
    title: '제72회 전국과학전람회',
    host: '과학기술정보통신부',
    category: '수학/과학',
    deadline: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '물리, 화학, 생물, 지구과학 등 총 8개 부문에서 기초 과학 연구 프로젝트를 수행하여 평가받는 역사 깊은 전국 전람회입니다.',
    image_url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.science.go.kr',
    bid_amount: 0
  },
  {
    id: 'a1777777-7777-7777-7777-888888888888',
    title: '제21회 전국 고등학생 경제한마당',
    host: '기획재정부',
    category: '기획/아이디어',
    deadline: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '청소년들의 합리적인 경제적 사고방식 배양과 미래 금융리더를 양성하기 위한 고등학교 대표 종합 경제 능력 평가 경시대회입니다.',
    image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.kdi.re.kr',
    bid_amount: 0
  },
  {
    id: 'a1888888-8888-8888-8888-999999999999',
    title: '제22회 전국 고등학생 지리올림피아드',
    host: '대한지리학회',
    category: '인문학',
    deadline: new Date(Date.now() + 26 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '지리적 분석력과 글로벌 역량을 평가하는 대회로, 전국 고등학생을 대상으로 지역 및 전국 본선으로 나뉘어 치뤄집니다.',
    image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.geography.or.kr',
    bid_amount: 0
  },
  {
    id: 'a1999999-9999-9999-9999-101010101010',
    title: '제28회 전국 중고생 자원봉사대회',
    host: '한국중등교장협의회',
    category: '봉사활동',
    deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '자발적인 봉사활동을 통해 사회적 책임감과 나눔 정신을 실천한 청소년 봉사자를 발굴하여 시상하는 프로그램입니다.',
    image_url: 'https://images.unsplash.com/photo-1469571486040-0b9b1757f520?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.spirit.or.kr',
    bid_amount: 7000
  },
  {
    id: 'a2020202-2020-2020-2020-202020202020',
    title: '2026 대한민국 청소년 발명 아이디어 경진대회',
    host: '한국대학발명협회',
    category: '창업',
    deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '청소년들의 지식재산에 대한 관심 제고와 실용적이고 창의적인 지식창업 아이디어를 발명 특허 연계로 확장 지원하는 공모전입니다.',
    image_url: 'https://images.unsplash.com/photo-1553876005-af1262f743c5?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.invent.or.kr',
    bid_amount: 0
  },
  {
    id: 'a2121212-2121-2121-2121-212121212121',
    title: '제20회 전국 청소년 모의재판 경연대회',
    host: '법무부',
    category: '인문학',
    deadline: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '법적 사고와 논리적 주장 전개를 겨루는 모의재판 경연으로, 중고등학생들이 팀을 이루어 민사/형사 모의재판 대본을 구성하여 진행합니다.',
    image_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.lawedu.go.kr',
    bid_amount: 0
  },
  {
    id: 'a2222222-2222-2222-3333-333333333333',
    title: '제22회 대한민국청소년박람회 디지털 콘텐츠 경진대회',
    host: '여성가족부',
    category: '미디어/영상',
    deadline: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '생성형 AI 기술 등을 적용하여 미래 사회의 기회와 도전을 보여주는 1분 숏폼 및 디지털 영상 콘텐츠 제작 대회입니다.',
    image_url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.kywa.or.kr',
    bid_amount: 4000
  },
  {
    id: 'a2323232-2323-2323-2323-232323232323',
    title: '제19회 전국 청소년 저작권 글짓기 대회',
    host: '문화체육관광부',
    category: '문학/수기',
    deadline: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '저작권의 가치와 창작자의 권리 보호를 주제로 자유롭게 작성하는 수필/글짓기 대회로, 청소년 저작권 인식을 고양시킵니다.',
    image_url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.copyright.or.kr',
    bid_amount: 0
  },
  {
    id: 'a2424242-2424-2424-2424-242424242424',
    title: '제56회 전국 청소년 세금문예작품 공모전',
    host: '국세청',
    category: '문학/수기',
    deadline: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '일상 속 세금의 가치와 필요성을 글, 포스터 등으로 표현하는 청소년 대표 세금 교육 공모 프로그램입니다.',
    image_url: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.nts.go.kr',
    bid_amount: 0
  },
  {
    id: 'a2525252-2525-2525-2525-252525252525',
    title: '제16회 한국 청소년 뇌과학 올림피아드 (Brain Bee)',
    host: '한국뇌연구원',
    category: '수학/과학',
    deadline: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString(),
    location: '대구',
    details: '뇌과학 이론 지식을 종합적으로 평가하는 경시 분야 대회로, 우수자는 국제 뇌과학올림피아드 국가대표 후보군이 됩니다.',
    image_url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.brainbee.or.kr',
    bid_amount: 0
  },
  {
    id: 'a2626262-2626-2626-2626-262626262626',
    title: '임베디드 소프트웨어 경진대회 2026 (주니어 부문)',
    host: '산업통상자원부',
    category: 'IT/개발',
    deadline: new Date(Date.now() + 48 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '초중고등학생들의 임베디드 코딩 능력 개발을 지원하며 자율주행 모형차 코딩 미션과 창의 아이디어를 시연하는 소프트웨어 경진대회입니다.',
    image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.embeddedcontest.or.kr',
    bid_amount: 0
  },
  {
    id: 'a2727272-2727-2727-2727-272727272727',
    title: '제25회 한국중학생물리대회 (KPhO)',
    host: '한국물리학회',
    category: '수학/과학',
    deadline: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '전국 중학생을 대상으로 물리적 사고력과 문제 해결 역량을 종합적으로 겨루는 역사와 신뢰를 보유한 물리 경시대회입니다.',
    image_url: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://kpho.kps.or.kr',
    bid_amount: 0
  },
  {
    id: 'a2828282-2828-2828-2828-282828282827',
    title: '제29회 한국화학올림피아드 (KChO)',
    host: '대한화학회',
    category: '수학/과학',
    deadline: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '중·고등학교 인재들의 화학적 재능 발굴을 목적으로 하는 최고 권위의 시험 중심 화학 전문 학술 대회입니다.',
    image_url: 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://kcho.kcsnet.or.kr',
    bid_amount: 0
  },
  {
    id: 'a2929292-2929-2929-2929-292929292929',
    title: '제27회 한국생물올림피아드 (KBO)',
    host: '한국생물과학협회',
    category: '수학/과학',
    deadline: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '유전, 분류, 생태 등 기초 생물학과 응용 생명과학에 대한 깊은 지식을 기르고 능력을 검정받는 대회입니다.',
    image_url: 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.kibo.or.kr',
    bid_amount: 0
  },
  {
    id: 'a3030303-3030-3030-3030-303030303030',
    title: '제23회 한국지구과학올림피아드 (KESO)',
    host: '한국지구과학회',
    category: '수학/과학',
    deadline: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '대기, 지질, 해양, 우주 분야에 이르기까지 지구적 환경과 과학 시스템에 대한 청소년 인재들의 실력을 테스트하는 공모 및 시험입니다.',
    image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.keso.or.kr',
    bid_amount: 0
  },
  {
    id: 'a3131313-3131-3131-3131-313131313131',
    title: '제24회 한국천문올림피아드 (KAO)',
    host: '한국천문학회',
    category: '수학/과학',
    deadline: new Date(Date.now() + 34 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '전국의 고등학교 및 중학교 학생을 위한 천문학 이론 및 우주 관측 경시대회로 우주과학 핵심 인재를 선발합니다.',
    image_url: 'https://images.unsplash.com/photo-1454789548928-9efd52dc4031?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.kao.or.kr',
    bid_amount: 0
  },
  {
    id: 'a3232323-3232-3232-3232-323232323232',
    title: '한국 청소년 물 포럼 2026 (Korea Junior Water Prize)',
    host: '한국물포럼',
    category: '수학/과학',
    deadline: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '수질 보전 및 수자원 보호에 관련된 청소년들의 기발한 과학적 해결 방안 논문 및 포스터 발표 대회로, 우수자는 스웨덴 국제대회 출전권이 부여됩니다.',
    image_url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.kjwp.or.kr',
    bid_amount: 0
  },
  {
    id: 'a3333333-3333-3333-4444-444444444444',
    title: '전국 청소년 스마트폰 영화제 (KYSF)',
    host: '영화진흥위원회',
    category: '미디어/영상',
    deadline: new Date(Date.now() + 54 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '오로지 스마트폰으로 제작한 창의적 10분 이내 스마트폰 단편영화 예술 공모로 청소년의 재치있는 영상 미디어를 심사합니다.',
    image_url: 'https://images.unsplash.com/photo-1512070679279-8988d32161be?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.kysf.kr',
    bid_amount: 0
  },
  {
    id: 'a3434343-3434-3434-3434-343434343434',
    title: '제20회 전국 청소년 국악경연대회',
    host: '국립국악원',
    category: '미술/디자인',
    deadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '판소리, 기악, 무용에 걸쳐 청소년 인재들의 수준 높은 기량을 겨루고 문화 예술적 감각을 발굴하는 종합 예술 대회입니다.',
    image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.gugak.go.kr',
    bid_amount: 0
  },
  {
    id: 'a3535353-3535-3535-3535-353535353535',
    title: '2026 전국 청소년 댄스 경연대회',
    host: '한국문화예술협회',
    category: '미술/디자인',
    deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    location: '서울',
    details: '중·고등학교 댄스 동아리 및 개인 청소년들의 자유로운 스트릿 댄스, 퍼포먼스 실력을 뽐내는 예술 축제이자 공모 경연입니다.',
    image_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.youthdance.or.kr',
    bid_amount: 0
  },
  {
    id: 'a3636363-3636-3636-3636-363636363636',
    title: '제21회 전국 청소년 숲사랑 작품공모전',
    host: '산림청',
    category: '미술/디자인',
    deadline: new Date(Date.now() + 38 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '자연 환경 보호와 숲에 대한 사랑을 글짓기 및 그림(미술)으로 표현하여 제출하는 자연 친화 감성 공모전입니다.',
    image_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.forest.go.kr',
    bid_amount: 0
  },
  {
    id: 'a3737373-3737-3737-3737-373737373737',
    title: '2026 전국 고등학생 디자인 실기대회',
    host: '경희대학교',
    category: '미술/디자인',
    deadline: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    location: '경기',
    details: '디자인 기초조형디자인 및 사고의 전환 부문 디자인 실기 실력을 대학 고사장에서 동일하게 겨루는 실기공모 대회입니다.',
    image_url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.khu.ac.kr',
    bid_amount: 6000
  },
  {
    id: 'a3838383-3838-3838-3838-383838383838',
    title: '제34회 대한민국 고등학교 디자인 공모전',
    host: '한국미술협회',
    category: '미술/디자인',
    deadline: new Date(Date.now() + 44 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '시각, 산업, 패션, 인테리어 디자인 분야에서 우수한 재능을 지닌 미래의 시각예술 디자이너 지망생들을 위한 공모전입니다.',
    image_url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.artdesign.co.kr',
    bid_amount: 0
  },
  {
    id: 'a3939393-3939-3939-3939-393939393939',
    title: '제20회 전국 중고등학생 다문화 교육 우수사례 공모전',
    host: '교육부',
    category: '인문학',
    deadline: new Date(Date.now() + 49 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '다문화에 대한 편견 해소와 올바른 다양성 존중 문화를 실천한 청소년들의 우수 극복 및 봉사활동, 글짓기 사례를 공모합니다.',
    image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.multiculture.or.kr',
    bid_amount: 0
  },
  {
    id: 'a4040404-4040-4040-4040-404040404040',
    title: '2026 청소년 평화통일 글짓기·토론대회',
    host: '민주평화통일자문회의',
    category: '문학/수기',
    deadline: new Date(Date.now() + 51 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '한반도의 미래 평화와 통일에 대한 청소년들의 열정과 지식을 기르는 에세이(글짓기) 및 토론 공모전입니다.',
    image_url: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.nuac.go.kr',
    bid_amount: 0
  },
  {
    id: 'a4141414-4141-4141-4141-414141414141',
    title: '제12회 전국 청소년 환경 글짓기/그림 공모전',
    host: '환경부',
    category: '문학/수기',
    deadline: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '환경 오염의 심각성을 알리고 생활 속 제로웨이스트(탄소저감) 환경 실천 방안에 관한 아이디어를 담은 작품 공모전입니다.',
    image_url: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.environ.or.kr',
    bid_amount: 0
  },
  {
    id: 'a4242424-4242-4242-4242-424242424242',
    title: '제18회 전국 고등학생 토론대회',
    host: '중앙선거방송토론위원회',
    category: '인문학',
    deadline: new Date(Date.now() + 36 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '지정된 시사 논제에 대하여 찬반 토론을 벌여 논리적 비판력과 설득 및 스피치 커뮤니케이션 능력을 종합 평가하는 토론 대회입니다.',
    image_url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.debates.go.kr',
    bid_amount: 0
  },
  {
    id: 'a4343433-4343-4343-4343-434343434343',
    title: '2026 전국 청소년 적십자(RCY) 인도주의 공모전',
    host: '대한적십자사',
    category: '봉사활동',
    deadline: new Date(Date.now() + 59 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '생명 존중 및 인도주의 정신을 함양하고 봉사 경험에 관한 미디어 콘텐츠 및 포스터, 소감 수기를 접수하는 사회 환원 공모전입니다.',
    image_url: 'https://images.unsplash.com/photo-1469571486040-0b9b1757f520?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.redcross.or.kr',
    bid_amount: 0
  },
  {
    id: 'a4444444-4444-4444-5555-555555555556',
    title: '제14회 전국 청소년 금연 영상/포스터 공모전',
    host: '보건복지부',
    category: '미디어/영상',
    deadline: new Date(Date.now() + 61 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '학교 내 간접 흡연 및 금연 실천을 유도하는 1분 숏폼 동영상 및 크리에이티브 지면 디자인 포스터 공모전입니다.',
    image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.nosmoking.or.kr',
    bid_amount: 0
  },
  {
    id: 'a4545454-4545-4545-4545-454545454545',
    title: '2026 한국 청소년 로봇 경진대회',
    host: '한국로봇산업진흥원',
    category: 'IT/개발',
    deadline: new Date(Date.now() + 67 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '로봇 코딩 및 하드웨어 제작 미션을 제한 시간 내에 해결하는 하이테크 미래 공학 경시대회로 고등부/중등부로 나뉘어 개최됩니다.',
    image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.robotcontest.or.kr',
    bid_amount: 0
  },
  {
    id: 'a4646464-4646-4646-4646-464646464646',
    title: '제26회 전국 고등학생 논술경시 대회',
    host: '성균관대학교',
    category: '문학/수기',
    deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '인문/사회 제반 이슈에 대해 비판적 성찰 및 인문학적 에세이 글짓기를 고사장에서 종합 검정하는 논술 전문 경시대회입니다.',
    image_url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.skku.edu',
    bid_amount: 0
  },
  {
    id: 'a4747474-4747-4747-4747-474747474747',
    title: '2026 전국 학생 디자인 공모전',
    host: '한국디자인진흥원',
    category: '미술/디자인',
    deadline: new Date(Date.now() + 74 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '기발한 아이디어를 가미한 친환경 및 편의 목적 제품/공간/UXUI 디자인 스케치 및 3D 그래픽을 공모 및 전시 지원합니다.',
    image_url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://www.kidp.or.kr',
    bid_amount: 0
  },
  {
    id: 'a4848484-4848-4848-4848-484848484848',
    title: '제29회 전국 청소년 연극제',
    host: '한국연극협회',
    category: '미디어/영상',
    deadline: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '청소년들이 직접 극작, 연출, 스태프로 활동하며 단체 연극 무대를 완성해 올리는 학원 극예술 경연 축제입니다.',
    image_url: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.theatre.or.kr',
    bid_amount: 0
  },
  {
    id: 'a4949494-4949-4949-4949-494949494949',
    title: '2026 청소년 스마트 리더십 캠프 및 공모전',
    host: '한국스마트교육협회',
    category: '기획/아이디어',
    deadline: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000).toISOString(),
    location: '전국',
    details: '디지털 트랜스포메이션과 리더십을 융합하여 미래의 기업가정신 모델을 기획 발표하는 종합 아카데미 및 해커톤 공모입니다.',
    image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.leadership.or.kr',
    bid_amount: 0
  },
  {
    id: 'a5050505-5050-5050-5050-505050505050',
    title: '제12회 전국 고등학생 의회교실 및 토론대회',
    host: '국회사무처',
    category: '인문학',
    deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    location: '서울',
    details: '의회 민주주의와 입법 과정을 배우며 현안 시사 정책 안건에 관해 직접 발언하고 모의 입법안을 상정하는 토론 경연 대회입니다.',
    image_url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=80&w=600&auto=format&fit=crop',
    apply_url: 'http://www.assembly.go.kr',
    bid_amount: 0
  },
  {
    id: 'a5151515-5151-5151-5151-515151515151',
    title: '제7회 기상청 달콤기후 공모전',
    host: '기상청',
    category: '미술/디자인, 문학/수기, 미디어/영상',
    deadline: '2026-06-12T23:59:59.000Z',
    location: '전국',
    details: '[공모전 개요] 「제7회 기상청 달콤기후 공모전」 ⏰ 공모기간 : 2026년 4월 23일(목) ~ 6월 12일(금) 📂 공모분야: 디자인(그림🎨, 캘리그래피📜), 이야기💡(4행시), 영상💡(생성형 AI 숏폼) 📂 공모주제: ① 온실가스, ② 달콤기후, ③ 미래날씨 (달콤기후는 달달하고 매콤한 기후변화과학의 줄임말) 📂 참가 대상: 대한민국 국민 누구나(단체 제외, 개인별 최대 3작품) 📂 접수 방법: 기후정보포털(http://www.climate.go.kr/home/) 및 소통24(https://sotong.go.kr./front/main/index.do/)를 통한 구글폼 접수 📂 시상 내역: 총 40작품 선정, 총 상금 970만원 (대상: 기후에너지환경부장관상 디자인 200만 원, 이야기 50만 원 등) [세부사항] - 디자인(그림): 수채화, 서양화, 동양화, 일러스트 등 (10호F 이내) - 디자인(캘리그래피): 디지털 캘리그래피 등 (8절지) - 이야기(4행시): 기후위기 극복 희망 메시지 (1행당 20자 이내) - 영상(생성형 AI 숏폼): AI 영상 1분 내외 (1920x1080 이상 해상도) ※ 문의: 운영사무국 (Tel. 070-7039-4373, 4121)',
    image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://forms.gle/fSoTT7abpi9c7ChN8',
    bid_amount: 16000
  }
];

// 모의 동아리 공고 데이터
const MOCK_CLUB_ANNOUNCEMENTS: ClubAnnouncement[] = [
  {
    id: 'club-1',
    school: '하나고등학교',
    club_name: 'ALGO',
    title: '2026 ALGO 알고리즘 학술 동아리 부원 모집',
    details: '하나고등학교 대표 알고리즘 학술 동아리 ALGO입니다. 백준 코딩테스트 문제풀이, 알고리즘 분석, 교외 대회 출전을 목적으로 활동합니다. 주 1회 세션 진행.',
    tags: ['IT/코딩', '학술', '인기'],
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=600&auto=format&fit=crop',
    created_at: new Date().toISOString()
  },
  {
    id: 'club-2',
    school: '한국디지털미디어고등학교',
    club_name: 'Motion',
    title: 'UI/UX 디자인 및 웹 퍼블리싱 동아리 Motion 14기 모집',
    details: '피그마(Figma) 조작부터 실제 웹 퍼블리싱까지! 모션은 디자인과 개발이 함께하는 융합형 동아리입니다. 해커톤 참가 및 프로젝트 제작 지원.',
    tags: ['디자인', '개발', '융합'],
    deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=600&auto=format&fit=crop',
    created_at: new Date().toISOString()
  },
  {
    id: 'club-3',
    school: '선린인터넷고등학교',
    club_name: 'SPARK',
    title: '청소년 스타트업 창업 및 기획 동아리 SPARK 신입 모집',
    details: '사업 기획서 작성, 린 스타트업 실행, 프로토타이핑을 경험하고 정기 청소년 창업대회 출전을 준비하는 선린인터넷고의 명문 창업 동아리입니다.',
    tags: ['창업', '기획', '마케팅'],
    deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop',
    created_at: new Date().toISOString()
  }
];

// 모의 팀 빌딩 구인글
const MOCK_TEAM_POSTS: TeamPost[] = [
  {
    id: 'team-p1',
    announcement_id: 'a1111111-1111-1111-1111-111111111111', // NYPC
    user_id: 'user-mock-1',
    user_name: '박서준',
    role_wanted: '기획',
    my_role: '개발',
    comment: 'C++ 백준 플래티넘 개발자입니다! NYPC 본선 진출을 함께 노려볼 기획 및 디자인 친구를 찾습니다. 아이디어 브레인스토밍부터 함께해요.',
    contact: '010-1234-5678',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'team-p2',
    announcement_id: 'a1111111-1111-1111-1111-111111111111', // NYPC
    user_id: 'user-mock-2',
    user_name: '최예원',
    role_wanted: '개발',
    my_role: '디자인',
    comment: '피그마로 UI 포트폴리오 다수 작업했습니다. 멋진 코딩 실력을 가진 개발자분과 팀을 이루어 출전하고 싶습니다!',
    contact: '010-5678-1234',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'team-p3',
    announcement_id: 'a3333333-3333-3333-3333-333333333333', // Samsung Junior SW
    user_id: 'user-mock-3',
    user_name: '정우진',
    role_wanted: '디자인',
    my_role: '기획',
    comment: '생활밀착형 사회 문제 해결 아이디어가 있습니다. 현재 프론트 개발자가 한 명 구해졌으며, 디자인을 입혀줄 figma 장인을 모집합니다.',
    contact: '010-1111-2222',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  }
];

// 모의 동아리 지원자 데이터
export interface ClubNetworking {
  id: string;
  host_school: string;
  host_club: string;
  title: string;
  description: string;
  event_date: string;
  target_audience: string;
  contact_link: string;
}

const MOCK_CLUB_NETWORKING: ClubNetworking[] = [
  {
    id: 'net-1',
    host_school: '하나고등학교',
    host_club: '코딩동아리 0101',
    title: '제1회 3개교 연합 알고리즘 해커톤',
    description: '하나고, 민사고, 외대부고 연합으로 진행되는 무박 2일 알고리즘 해커톤에 참여할 타 학교 코딩 동아리를 모집합니다!',
    event_date: '2026.07.25 ~ 07.26',
    target_audience: '전국 고등학교 코딩/개발 동아리',
    contact_link: 'https://open.kakao.com/o/sample1'
  },
  {
    id: 'net-2',
    host_school: '대원외국어고등학교',
    host_club: '연극부 ACT',
    title: '외고 연합 영어 연극 교류전',
    description: '여름방학 기간 동안 함께 영어 연극을 기획하고 무대에 올릴 타 외고 연극부를 찾고 있습니다.',
    event_date: '2026.08.15',
    target_audience: '외국어고등학교 연극 동아리',
    contact_link: 'https://open.kakao.com/o/sample2'
  },
  {
    id: 'net-3',
    host_school: '상산고등학교',
    host_club: '농구부 AIR',
    title: '전국 자사고 친선 농구대회',
    description: '상산고 체육관에서 진행되는 자사고 농구 교류전에 참가할 팀을 모집합니다. 경기 후 네트워킹 시간도 준비되어 있습니다.',
    event_date: '2026.09.10',
    target_audience: '전국 자사고 농구/체육 동아리',
    contact_link: 'https://open.kakao.com/o/sample3'
  }
];

const MOCK_CLUB_APPLICANTS: ClubApplicant[] = [
  {
    id: 'app-1',
    club_id: 'club-1', // ALGO
    user_id: 'user-mock-student-1',
    user_name: '김민지',
    user_school: '하나고등학교',
    user_grade: '2학년',
    user_contact: 'minji@gmail.com',
    user_skills: ['Python', 'C++', 'Algorithms'],
    user_awards: [{ contestName: '교내 정보 경시대회', prize: '은상' }],
    introduction_summary: '알고리즘 문제풀이를 무척 좋아하며 백준 골드3 수준입니다. ALGO 동아리에서 백준 스터디를 함께 하고 싶습니다!',
    status: 'pending',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'app-2',
    club_id: 'club-1', // ALGO
    user_id: 'user-mock-student-2',
    user_name: '이찬우',
    user_school: '하나고등학교',
    user_grade: '1학년',
    user_contact: 'chanwoo@gmail.com',
    user_skills: ['JavaScript', 'HTML/CSS'],
    user_awards: [],
    introduction_summary: '아직 알고리즘 지식은 기초적이지만, 선배들께 열심히 배워서 올해 경시대회 입상을 해보고 싶습니다.',
    status: 'approved',
    created_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
  }
];

// 로컬 스토리지 키
const STORAGE_KEYS = {
  PROFILE: 'kkeul_profile',
  BOOKMARKS: 'kkeul_bookmarks',
  ANNOUNCEMENTS: 'kkeul_announcements'
};

// 로컬 모드 여부를 판단하기 위한 헬퍼
let useLocalFallback = false;

// 초기 공고 세팅 및 리크루팅 씨딩
if (!localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS)) {
  localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(MOCK_ANNOUNCEMENTS));
}
if (!localStorage.getItem('kkeul_club_announcements')) {
  localStorage.setItem('kkeul_club_announcements', JSON.stringify(MOCK_CLUB_ANNOUNCEMENTS));
}
if (!localStorage.getItem('kkeul_team_posts')) {
  localStorage.setItem('kkeul_team_posts', JSON.stringify(MOCK_TEAM_POSTS));
}
if (!localStorage.getItem('kkeul_club_applicants')) {
  localStorage.setItem('kkeul_club_applicants', JSON.stringify(MOCK_CLUB_APPLICANTS));
      localStorage.setItem('kkeul_club_networking', JSON.stringify(MOCK_CLUB_NETWORKING));
}
if (!localStorage.getItem('kkeul_join_requests')) {
  localStorage.setItem('kkeul_join_requests', JSON.stringify([]));
}

export interface AdminReport {
  target_type: 'team_post' | 'join_request';
  target_id: string;
  report_count: number;
  last_reported_at: string;
  reasons: string[];
  resolved: boolean;
  resolution: string | null;
  author_id: string | null;
  author_name: string | null;
  content: string | null;
  is_hidden: boolean | null;
  target_exists: boolean;
  announcement_id: string | null;
  author_suspended: boolean;
}

export interface AdminSuspendedUser {
  user_id: string;
  name: string | null;
  reason: string | null;
  created_at: string;
}

// ------------------------------------------------------------------
// 안전 기능용 헬퍼
// ------------------------------------------------------------------
const LOCAL_KEYS = {
  BLOCKS: 'kkeul_blocked_user_ids'
};

const readLocal = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeLocal = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const localId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`;

// 체험용 예시 데이터나 로컬 계정이 만든 항목은 UUID가 아니므로 DB로 보내지 않는다.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isLocalOnlyId = (id: string) => !UUID_RE.test(id);

// Supabase 로그인 세션의 사용자 ID (없으면 로컬/체험 모드)
export const getSessionUserId = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
};

// DB가 쓰기를 거절했을 때 이용 정지 여부를 확인해 알아듣기 쉬운 오류로 바꾼다.
const explainWriteError = async (error: { code?: string; message: string }): Promise<Error> => {
  if (error.code === '42501') {
    const uid = await getSessionUserId();
    if (uid) {
      const { data } = await supabase.from('suspended_users').select('user_id').eq('user_id', uid).maybeSingle();
      if (data) return new Error('이용이 정지된 계정이라 글을 올리거나 요청을 보낼 수 없어요.');
    }
    return new Error('권한이 없어 저장하지 못했어요.');
  }
  if (error.code === '23505') return new Error('이미 처리된 요청이에요.');
  return new Error(error.message);
};

const ensurePortfolioDefaults = (profile: Profile): Profile => profile;

export const db = {
  // 0. 인증 관련 기능
  async signUp(email: string, password: string, name: string): Promise<{ user: any; error: any }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (err: any) {
      console.error('Supabase Auth SignUp Error:', err);
      return { user: null, error: err };
    }
  },

  async signIn(email: string, password: string): Promise<{ user: any; error: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (err: any) {
      console.error('Supabase Auth SignIn Error:', err);
      return { user: null, error: err };
    }
  },

  // 1. 공고 가져오기
  async getAnnouncements(): Promise<Announcement[]> {
    let remoteAnnouncements: Announcement[] = [];
    if (!useLocalFallback) {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('bid_amount', { ascending: false })
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data) {
          remoteAnnouncements = data as Announcement[];
        }
      } catch (err) {
        console.warn('Supabase 공고 로드 실패, 로컬 백업을 사용합니다.', err);
        useLocalFallback = true;
      }
    }

    const local = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
    let localList: Announcement[] = local ? JSON.parse(local) : [];

    // 실제 공고가 DB에서 내려오면, 앱에 내장된 예시 공고(마감일이 가짜)는 섞지 않는다
    if (remoteAnnouncements.length > 0) {
      const sampleIds = new Set(MOCK_ANNOUNCEMENTS.map(a => a.id));
      localList = localList.filter(a => !sampleIds.has(a.id));
    }

    // 원격 및 로컬 데이터를 ID 기준 중복 없이 병합
    const mergedMap = new Map<string, Announcement>();
    remoteAnnouncements.forEach(ann => mergedMap.set(ann.id, ann));
    localList.forEach(ann => {
      if (!mergedMap.has(ann.id)) {
        mergedMap.set(ann.id, ann);
      }
    });

    const loaded = Array.from(mergedMap.values());
    if (loaded.length === 0) {
      // 로컬/원격 모두 비었으면 모의 데이터 기본 세팅
      localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(MOCK_ANNOUNCEMENTS));
      return MOCK_ANNOUNCEMENTS;
    }

    // 정렬 (입찰 금액 순 -> 최신 등록 순)
    return loaded.sort((a: any, b: any) => {
      const bidDiff = (b.bid_amount || 0) - (a.bid_amount || 0);
      if (bidDiff !== 0) return bidDiff;
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  },

  // 2. 프로필 조회
  async getProfile(email: string): Promise<Profile | null> {
    if (!useLocalFallback) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          const profileWithDefaults = ensurePortfolioDefaults(data as Profile);
          // 연락처는 별도 테이블. 본인 것만(또는 수락된 상대만) DB가 돌려준다.
          try {
            const ownContact = await db.getContact(profileWithDefaults.id);
            if (ownContact) profileWithDefaults.contact = ownContact;
          } catch (contactErr) {
            console.warn('연락처 조회 실패:', contactErr);
          }
          const localProfiles = localStorage.getItem('kkeul_mock_profiles');
          const profiles = localProfiles ? JSON.parse(localProfiles) : [];
          const idx = profiles.findIndex((p: any) => p.email === email);
          if (idx >= 0) profiles[idx] = profileWithDefaults;
          else profiles.push(profileWithDefaults);
          localStorage.setItem('kkeul_mock_profiles', JSON.stringify(profiles));
          return profileWithDefaults;
        }
      } catch (err) {
        console.warn('Supabase 프로필 조회 실패, 로컬 백업을 사용합니다.', err);
        useLocalFallback = true;
      }
    }
    const localProfiles = localStorage.getItem('kkeul_mock_profiles');
    if (localProfiles) {
      const profiles = JSON.parse(localProfiles);
      const prof = profiles.find((p: any) => p.email === email);
      if (prof) return ensurePortfolioDefaults(prof as Profile);
    }
    const localProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (localProfile) {
      const prof = JSON.parse(localProfile) as Profile;
      if (prof.email === email) return ensurePortfolioDefaults(prof);
    }
    return null;
  },

  // 2.5. 매칭 학생 수 계산용 프로필 목록
  //      다른 사람의 이름·이메일·ID는 받지 않고 역할·지역·학년·관심 분야만 받는다.
  async getAllProfiles(): Promise<Pick<Profile, 'role' | 'location' | 'grade' | 'interests'>[]> {
    if (!useLocalFallback && (await getSessionUserId())) {
      try {
        const { data, error } = await supabase.rpc('matching_profiles');
        if (error) throw error;
        if (data) {
          return (data as Array<{ role: string; location: string; grade: string; interests: string[] | null }>).map(p => ({
            role: (p.role as Profile['role']) || 'student',
            location: p.location || '',
            grade: p.grade || '',
            interests: Array.isArray(p.interests) ? p.interests : []
          }));
        }
      } catch (err) {
        console.warn('Supabase profiles 조회 실패, 로컬 백업을 사용합니다.', err);
        useLocalFallback = true;
      }
    }
    const localProfiles = localStorage.getItem('kkeul_mock_profiles');
    if (localProfiles) {
      return (JSON.parse(localProfiles) as Profile[]).map(p => ensurePortfolioDefaults(p));
    }
    return [];
  },

  // 3. 프로필 저장/업데이트
  async saveProfile(profile: Profile): Promise<Profile> {
    const profileWithDefaults = ensurePortfolioDefaults(profile);
    if (!useLocalFallback) {
      try {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', profileWithDefaults.id)
          .single();
        
        let error;
        if (existing) {
          const { error: err } = await supabase
            .from('profiles')
            .update({
              name: profileWithDefaults.name,
              location: profileWithDefaults.location,
              grade: profileWithDefaults.grade,
              school: profileWithDefaults.school,
              major: profileWithDefaults.major,
              interests: profileWithDefaults.interests,
              xp: profileWithDefaults.xp,
              badges: profileWithDefaults.badges,
              role: profileWithDefaults.role,
              ...(profileWithDefaults.age_over14_confirmed
                ? {
                    age_over14_confirmed: true,
                    age_over14_confirmed_at: profileWithDefaults.age_over14_confirmed_at
                  }
                : {}),
              ...(profileWithDefaults.terms_version
                ? {
                    terms_version: profileWithDefaults.terms_version,
                    terms_agreed_at: profileWithDefaults.terms_agreed_at
                  }
                : {}),
              ...(profileWithDefaults.competency_consent !== undefined
                ? {
                    competency_consent: profileWithDefaults.competency_consent,
                    competency_consent_at: profileWithDefaults.competency_consent_at ?? null
                  }
                : {})
            })
            .eq('id', profileWithDefaults.id);
          error = err;
        } else {
          // 연락처는 profiles 가 아니라 user_contacts 에 저장한다. agreeDisclaimer 는 DB 컬럼이 아니다.
          const { major, contact, phone_number, agreeDisclaimer, ...remoteProfile } = profileWithDefaults;
          const { error: err } = await supabase
            .from('profiles')
            .insert(remoteProfile);
          error = err;
        }
        if (error) throw error;
        if (profileWithDefaults.contact !== undefined) {
          await db.saveMyContact(profileWithDefaults.contact || '');
        }
      } catch (err: any) {
        console.error('Supabase 프로필 저장 실패:', err);
        // alert('Supabase 프로필 저장 오류: ' + JSON.stringify(err));
        useLocalFallback = true;
      }
    }
    const localProfiles = localStorage.getItem('kkeul_mock_profiles');
    const profiles = localProfiles ? JSON.parse(localProfiles) : [];
    const idx = profiles.findIndex((p: any) => p.email === profileWithDefaults.email);
    if (idx >= 0) profiles[idx] = profileWithDefaults;
    else profiles.push(profileWithDefaults);
    localStorage.setItem('kkeul_mock_profiles', JSON.stringify(profiles));

    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profileWithDefaults));
    return profileWithDefaults;
  },

  // 4. 찜 추가
  async addBookmark(userId: string, _email: string, announcementId: string): Promise<boolean> {
    const bookmarks = this.getLocalBookmarks();
    if (!bookmarks.includes(announcementId)) {
      bookmarks.push(announcementId);
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    }

    if (!useLocalFallback) {
      try {
        const { error } = await supabase
          .from('bookmarks')
          .insert({ user_id: userId, announcement_id: announcementId });
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase 찜 추가 실패, 로컬 백업에 저장합니다.', err);
        useLocalFallback = true;
      }
    }
    return true;
  },

  // 5. 찜 해제
  async removeBookmark(userId: string, _email: string, announcementId: string): Promise<boolean> {
    let bookmarks = this.getLocalBookmarks();
    bookmarks = bookmarks.filter(id => id !== announcementId);
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));

    if (!useLocalFallback) {
      try {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', userId)
          .eq('announcement_id', announcementId);
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase 찜 해제 실패, 로컬 백업을 유지합니다.', err);
        useLocalFallback = true;
      }
    }
    return true;
  },

  // 6. 찜 목록 조회
  async getBookmarks(userId: string, _email: string): Promise<string[]> {
    let remoteBookmarks: string[] = [];
    if (!useLocalFallback) {
      try {
        const { data, error } = await supabase
          .from('bookmarks')
          .select('announcement_id')
          .eq('user_id', userId);
        if (error) throw error;
        if (data) remoteBookmarks = data.map(item => item.announcement_id);
      } catch (err) {
        console.warn('Supabase 찜 목록 조회 실패, 로컬 백업을 사용합니다.', err);
        useLocalFallback = true;
      }
    }
    
    // 로컬과 원격 병합
    const localBookmarks = this.getLocalBookmarks();
    const merged = Array.from(new Set([...localBookmarks, ...remoteBookmarks]));
    
    // 로컬 스토리지에 동기화
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(merged));
    return merged;
  },

  // 7. 공고 생성
  async createAnnouncement(ann: Omit<Announcement, 'id'>): Promise<Announcement> {
    const newId = 'ann-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
    const fullAnn: Announcement = { 
      ...ann, 
      id: newId, 
      bid_amount: ann.bid_amount || 0,
      created_at: new Date().toISOString()
    };
    
    // Always pre-save to local announcements
    const local = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
    const localAnnouncements: Announcement[] = local ? JSON.parse(local) : [];
    
    if (!useLocalFallback) {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .insert({
            title: ann.title,
            host: ann.host,
            category: ann.category,
            deadline: ann.deadline,
            location: ann.location,
            details: ann.details,
            image_url: ann.image_url,
            apply_url: ann.apply_url,
            bid_amount: ann.bid_amount || 0
          })
          .select('*')
          .single();
        if (error) throw error;
        if (data) {
          localAnnouncements.unshift(data as Announcement);
          localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(localAnnouncements));
          return data as Announcement;
        }
      } catch (err) {
        console.warn('Supabase 공고 생성 실패, 로컬 백업에 저장합니다.', err);
        useLocalFallback = true;
      }
    }
    
    localAnnouncements.unshift(fullAnn);
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(localAnnouncements));
    return fullAnn;
  },

  // 8. 공고 수정
  async updateAnnouncement(id: string, updatedFields: Partial<Announcement>): Promise<boolean> {
    if (!useLocalFallback) {
      try {
        const { error } = await supabase
          .from('announcements')
          .update(updatedFields)
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase 공고 수정 실패, 로컬 백업에 반영합니다.', err);
        useLocalFallback = true;
      }
    }
    
    const local = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
    if (local) {
      const announcements: Announcement[] = JSON.parse(local);
      const idx = announcements.findIndex(ann => ann.id === id);
      if (idx >= 0) {
        announcements[idx] = { ...announcements[idx], ...updatedFields };
        localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
      }
    }
    return true;
  },

  // 9. 공고 삭제
  async deleteAnnouncement(id: string): Promise<boolean> {
    if (!useLocalFallback) {
      try {
        const { error } = await supabase
          .from('announcements')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase 공고 삭제 실패, 로컬 백업에서 지웁니다.', err);
        useLocalFallback = true;
      }
    }
    
    const local = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
    if (local) {
      let announcements: Announcement[] = JSON.parse(local);
      announcements = announcements.filter(ann => ann.id !== id);
      localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
    }
    return true;
  },

  // 헬퍼: 로컬 북마크
  getLocalBookmarks(): string[] {
    const local = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    return local ? JSON.parse(local) : [];
  },

  // 10. 사용자 액션 기록 (스와이프 Like / Pass)
  async recordUserAction(userId: string, email: string, announcementId: string, actionType: 'like' | 'pass'): Promise<boolean> {
    if (!useLocalFallback) {
      try {
        const { error } = await supabase
          .from('user_actions')
          .insert({
            user_id: userId,
            announcement_id: announcementId,
            action_type: actionType,
            created_at: new Date().toISOString()
          });
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase user_actions 기록 실패, 로컬 백업에 저장합니다.', err);
        useLocalFallback = true;
      }
    }
    
    // 로컬 백업 저장
    const localKey = 'kkeul_user_actions';
    const local = localStorage.getItem(localKey);
    const actions = local ? JSON.parse(local) : [];
    actions.push({
      user_id: userId,
      email,
      announcement_id: announcementId,
      action_type: actionType,
      created_at: new Date().toISOString()
    });
    localStorage.setItem(localKey, JSON.stringify(actions));
    
    return true;
  },

  // 11. 사용자 액션 목록 조회
  async getUserActions(userId: string, email: string): Promise<{ announcement_id: string; action_type: 'like' | 'pass' }[]> {
    if (!useLocalFallback) {
      try {
        const { data, error } = await supabase
          .from('user_actions')
          .select('announcement_id, action_type')
          .eq('user_id', userId);
        if (error) throw error;
        if (data) return data as { announcement_id: string; action_type: 'like' | 'pass' }[];
      } catch (err) {
        console.warn('Supabase user_actions 조회 실패, 로컬 백업을 사용합니다.', err);
        useLocalFallback = true;
      }
    }
    
    const localKey = 'kkeul_user_actions';
    const local = localStorage.getItem(localKey);
    const actions = local ? JSON.parse(local) : [];
    return actions
      .filter((act: any) => act.user_id === userId || act.email === email)
      .map((act: any) => ({
        announcement_id: act.announcement_id,
        action_type: act.action_type
      }));
  },

  // ------------------------------------------------------------------
  // 팀 빌딩 · 신고 · 차단 · 연락처 · 동아리
  // Supabase 로그인 세션이 있으면 DB(RLS 적용)를 쓰고,
  // 세션이 없는 로컬/체험 계정이면 기존처럼 이 기기의 localStorage 를 씁니다.
  // ------------------------------------------------------------------

  // 12. 팀 빌딩 구인글 목록 조회 (신고로 숨겨진 글·내가 차단한 사람의 글 제외)
  async getTeamPosts(announcementId: string): Promise<TeamPost[]> {
    const uid = await getSessionUserId();
    if (uid) {
      const { data, error } = await supabase
        .from('team_posts')
        .select('*')
        .eq('announcement_id', announcementId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TeamPost[];
    }
    const blocked = readLocal<string[]>(LOCAL_KEYS.BLOCKS, []);
    return readLocal<TeamPost[]>('kkeul_team_posts', [])
      .filter(p => p.announcement_id === announcementId)
      .filter(p => !p.is_hidden && !blocked.includes(p.user_id));
  },

  // 13. 팀 빌딩 구인글 작성
  async createTeamPost(post: Pick<TeamPost, 'announcement_id' | 'user_id' | 'user_name' | 'role_wanted' | 'my_role' | 'comment'>): Promise<TeamPost> {
    const uid = await getSessionUserId();
    if (uid) {
      const { data, error } = await supabase
        .from('team_posts')
        .insert({ ...post, user_id: uid })
        .select('*')
        .single();
      if (error) throw await explainWriteError(error);
      return data as TeamPost;
    }
    const fullPost: TeamPost = { ...post, id: localId('team-post'), created_at: new Date().toISOString() };
    writeLocal('kkeul_team_posts', [fullPost, ...readLocal<TeamPost[]>('kkeul_team_posts', [])]);
    return fullPost;
  },

  // 14. 팀 합류 요청 보내기
  async sendJoinRequest(req: Pick<JoinRequest, 'post_id' | 'user_id' | 'user_name' | 'user_role' | 'message'>): Promise<JoinRequest> {
    const uid = await getSessionUserId();
    if (uid) {
      const { data, error } = await supabase
        .from('join_requests')
        .insert({ ...req, user_id: uid })
        .select('*')
        .single();
      if (error) throw await explainWriteError(error);
      return data as JoinRequest;
    }
    const fullReq: JoinRequest = { ...req, id: localId('join-req'), status: 'pending', created_at: new Date().toISOString() };
    writeLocal('kkeul_join_requests', [...readLocal<JoinRequest[]>('kkeul_join_requests', []), fullReq]);
    return fullReq;
  },

  // 15. 내 구인글에 들어온 합류 요청 (신고로 숨겨진 요청·차단한 사람의 요청 제외)
  async getJoinRequests(postId: string): Promise<JoinRequest[]> {
    const uid = await getSessionUserId();
    if (uid) {
      const { data, error } = await supabase
        .from('join_requests')
        .select('*')
        .eq('post_id', postId)
        .neq('user_id', uid)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as JoinRequest[];
    }
    const blocked = readLocal<string[]>(LOCAL_KEYS.BLOCKS, []);
    return readLocal<JoinRequest[]>('kkeul_join_requests', [])
      .filter(r => r.post_id === postId && !r.is_hidden && !blocked.includes(r.user_id));
  },

  // 15-1. 내가 보낸 합류 요청들 (상태 확인용)
  async getMyJoinRequests(userId: string): Promise<JoinRequest[]> {
    const uid = await getSessionUserId();
    if (uid) {
      const { data, error } = await supabase.from('join_requests').select('*').eq('user_id', uid);
      if (error) throw error;
      return (data || []) as JoinRequest[];
    }
    return readLocal<JoinRequest[]>('kkeul_join_requests', []).filter(r => r.user_id === userId);
  },

  // 15-2. 합류 요청 수락 / 거절 (구인글 작성자만 가능 — DB에서 강제)
  async updateJoinRequestStatus(requestId: string, status: 'accepted' | 'rejected'): Promise<void> {
    const uid = await getSessionUserId();
    if (uid) {
      const { data, error } = await supabase
        .from('join_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('이 요청의 상태를 바꿀 권한이 없어요.');
      return;
    }
    const all = readLocal<JoinRequest[]>('kkeul_join_requests', []);
    writeLocal('kkeul_join_requests', all.map(r => (r.id === requestId ? { ...r, status } : r)));
  },

  // 15-3. 신고 → DB 트리거가 대상을 즉시 숨김
  async reportContent(targetType: 'team_post' | 'join_request', targetId: string, reason: string): Promise<void> {
    const uid = await getSessionUserId();
    if (uid) {
      const { error } = await supabase
        .from('reports')
        .insert({ reporter_id: uid, target_type: targetType, target_id: targetId, reason: reason || null });
      // 같은 대상을 이미 신고했다면(unique 위반) 이미 숨겨진 상태이므로 성공으로 처리
      if (error && error.code !== '23505') throw error;
      return;
    }
    const key = targetType === 'team_post' ? 'kkeul_team_posts' : 'kkeul_join_requests';
    const items = readLocal<Array<{ id: string; is_hidden?: boolean }>>(key, []);
    writeLocal(key, items.map(it => (it.id === targetId ? { ...it, is_hidden: true } : it)));
  },

  // 15-4. 차단 (상대에게 알리지 않음)
  async blockUser(targetUserId: string): Promise<void> {
    const uid = await getSessionUserId();
    if (uid) {
      if (uid === targetUserId) return;
      const { error } = await supabase.from('user_blocks').insert({ blocker_id: uid, blocked_id: targetUserId });
      if (error && error.code !== '23505') throw error;
      return;
    }
    const blocked = readLocal<string[]>(LOCAL_KEYS.BLOCKS, []);
    if (!blocked.includes(targetUserId)) writeLocal(LOCAL_KEYS.BLOCKS, [...blocked, targetUserId]);
  },

  // 15-5. 연락처 조회 — 본인 또는 합류 요청이 수락된 상대만 DB가 돌려줌
  async getContact(userId: string): Promise<string | null> {
    const uid = await getSessionUserId();
    if (uid) {
      const { data, error } = await supabase
        .from('user_contacts')
        .select('contact, phone_number')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data ? (data.contact || data.phone_number || null) : null;
    }
    const mine = readLocal<Profile | null>(STORAGE_KEYS.PROFILE, null);
    return mine && mine.id === userId ? mine.contact || null : null;
  },

  // 15-5b. 명함 QR 공개 프로필 (로그인 없이 조회, 공개해도 되는 항목만 DB 함수가 돌려줌)
  async getPublicProfile(shortId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase.rpc('public_profile', { short_id: shortId });
    if (error) throw error;
    return (data as Record<string, unknown> | null) ?? null;
  },

  // 15-6. 내 연락처 저장 (프로필과 분리된 테이블)
  async saveMyContact(contact: string): Promise<void> {
    const uid = await getSessionUserId();
    if (!uid) return; // 로컬 계정은 프로필(localStorage)에만 저장
    const { error } = await supabase
      .from('user_contacts')
      .upsert({ user_id: uid, contact: contact || null, updated_at: new Date().toISOString() });
    if (error) throw error;
  },

  // ------------------------------------------------------------------
  // 관리자 기능. 권한은 DB 함수가 다시 확인하므로, 관리자가 아니면 모두 거부된다.
  // ------------------------------------------------------------------
  async isAdmin(): Promise<boolean> {
    const uid = await getSessionUserId();
    if (!uid) return false;
    const { data, error } = await supabase.from('admins').select('user_id').eq('user_id', uid).maybeSingle();
    return !error && !!data;
  },

  async adminListReports(includeResolved = false): Promise<AdminReport[]> {
    const { data, error } = await supabase.rpc('admin_list_reports', { include_resolved: includeResolved });
    if (error) throw new Error(error.message);
    return (data || []) as AdminReport[];
  },

  async adminResolveReport(targetType: AdminReport['target_type'], targetId: string, action: 'restore' | 'delete'): Promise<void> {
    const { error } = await supabase.rpc('admin_resolve_report', { p_target_type: targetType, p_target_id: targetId, p_action: action });
    if (error) throw new Error(error.message);
  },

  async adminSetSuspension(userId: string, suspend: boolean, reason = ''): Promise<void> {
    const { error } = await supabase.rpc('admin_set_suspension', { p_user_id: userId, p_suspend: suspend, p_reason: reason });
    if (error) throw new Error(error.message);
  },

  async adminListSuspended(): Promise<AdminSuspendedUser[]> {
    const { data, error } = await supabase.rpc('admin_list_suspended');
    if (error) throw new Error(error.message);
    return (data || []) as AdminSuspendedUser[];
  },

  async adminDeleteAnnouncement(id: string): Promise<void> {
    const { error } = await supabase.rpc('admin_delete_announcement', { p_id: id });
    if (error) throw new Error(error.message);
  },

  async adminListClubAnnouncements(): Promise<ClubAnnouncement[]> {
    const { data, error } = await supabase.from('club_announcements').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as ClubAnnouncement[];
  },

  async adminDeleteClubAnnouncement(id: string): Promise<void> {
    const { error } = await supabase.rpc('admin_delete_club_announcement', { p_id: id });
    if (error) throw new Error(error.message);
  },

  // 16. 교내 동아리 공고 목록 조회 (DB 공고 + 체험용 예시 공고)
  async getClubAnnouncements(schoolName: string): Promise<ClubAnnouncement[]> {
    const showAll = !schoolName || schoolName === '전국' || schoolName === '전체';
    let remote: ClubAnnouncement[] = [];
    if (await getSessionUserId()) {
      let query = supabase.from('club_announcements').select('*').order('created_at', { ascending: false });
      if (!showAll) query = query.eq('school', schoolName);
      const { data, error } = await query;
      if (error) console.warn('동아리 공고 조회 실패:', error);
      else remote = (data || []) as ClubAnnouncement[];
    }
    const local = readLocal<ClubAnnouncement[]>('kkeul_club_announcements', [])
      .filter(a => showAll || a.school === schoolName)
      .filter(a => !remote.some(r => r.id === a.id));
    return [...remote, ...local];
  },

  // 17. 교내 동아리 공고 작성 (작성자가 그 동아리의 기장이 됨)
  async createClubAnnouncement(ann: Omit<ClubAnnouncement, 'id' | 'created_at'>): Promise<ClubAnnouncement> {
    const uid = await getSessionUserId();
    if (uid) {
      const { data, error } = await supabase
        .from('club_announcements')
        .insert({ ...ann, leader_id: uid })
        .select('*')
        .single();
      if (error) throw await explainWriteError(error);
      return data as ClubAnnouncement;
    }
    const fullAnn: ClubAnnouncement = { ...ann, id: localId('club-ann'), created_at: new Date().toISOString() };
    writeLocal('kkeul_club_announcements', [fullAnn, ...readLocal<ClubAnnouncement[]>('kkeul_club_announcements', [])]);
    return fullAnn;
  },

  // 18. 동아리 지원 신청
  async applyToClub(app: Omit<ClubApplicant, 'id' | 'created_at' | 'status'>): Promise<ClubApplicant> {
    const uid = await getSessionUserId();
    if (uid && !isLocalOnlyId(app.club_id)) {
      const { data, error } = await supabase
        .from('club_applications')
        .insert({ ...app, user_id: uid })
        .select('*')
        .single();
      if (error) throw await explainWriteError(error);
      return data as ClubApplicant;
    }
    const fullApp: ClubApplicant = { ...app, id: localId('club-app'), status: 'pending', created_at: new Date().toISOString() };
    writeLocal('kkeul_club_applicants', [...readLocal<ClubApplicant[]>('kkeul_club_applicants', []), fullApp]);
    return fullApp;
  },

  // 18-1. 내가 낸 동아리 지원서와 심사 결과
  async getMyClubApplications(userId: string): Promise<ClubApplicant[]> {
    const local = readLocal<ClubApplicant[]>('kkeul_club_applicants', []).filter(a => a.user_id === userId);
    const uid = await getSessionUserId();
    if (!uid) return local;
    const { data, error } = await supabase.from('club_applications').select('*').eq('user_id', uid);
    if (error) {
      console.warn('내 동아리 지원서 조회 실패:', error);
      return local;
    }
    return [...((data || []) as ClubApplicant[]), ...local];
  },

  async getClubNetworking(): Promise<ClubNetworking[]> {
    return readLocal<ClubNetworking[]>('kkeul_club_networking', []);
  },

  // 19. 동아리별 지원자 목록 — DB 동아리는 기장만 받아볼 수 있음(지원자는 자기 것만)
  async getClubApplicants(clubId: string): Promise<ClubApplicant[]> {
    if (!isLocalOnlyId(clubId) && (await getSessionUserId())) {
      const { data, error } = await supabase
        .from('club_applications')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as ClubApplicant[];
    }
    return readLocal<ClubApplicant[]>('kkeul_club_applicants', []).filter(a => a.club_id === clubId);
  },

  // 20. 동아리 지원 심사 상태 업데이트 (기장만 가능 — DB에서 강제)
  async updateClubApplicantStatus(appId: string, status: 'approved' | 'rejected'): Promise<boolean> {
    if (!isLocalOnlyId(appId) && (await getSessionUserId())) {
      const { data, error } = await supabase
        .from('club_applications')
        .update({ status })
        .eq('id', appId)
        .select('id');
      if (error) throw error;
      return !!data && data.length > 0;
    }
    const applicants = readLocal<ClubApplicant[]>('kkeul_club_applicants', []);
    const idx = applicants.findIndex(a => a.id === appId);
    if (idx < 0) return false;
    applicants[idx].status = status;
    writeLocal('kkeul_club_applicants', applicants);
    return true;
  }
};
