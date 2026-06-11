-- 1. 기존 데이터 전체 초기화 (찜 목록 -> 공고 -> 프로필 순으로 정리)
truncate table public.bookmarks cascade;
truncate table public.announcements cascade;
delete from public.profiles;

-- 2. 공고 테이블(Announcements) RLS 정책 확인 및 설정
drop policy if exists "누구나 공고를 조회할 수 있습니다." on public.announcements;
create policy "누구나 공고를 조회할 수 있습니다."
  on public.announcements for select
  using (true);

drop policy if exists "누구나 공고를 삽입할 수 있습니다." on public.announcements;
create policy "누구나 공고를 삽입할 수 있습니다."
  on public.announcements for insert
  with check (true);

drop policy if exists "누구나 공고를 수정할 수 있습니다." on public.announcements;
create policy "누구나 공고를 수정할 수 있습니다."
  on public.announcements for update
  using (true);

drop policy if exists "누구나 공고를 삭제할 수 있습니다." on public.announcements;
create policy "누구나 공고를 삭제할 수 있습니다."
  on public.announcements for delete
  using (true);

-- 3. 실존 청소년 네임드 공모전 및 경시대회 50종 데이터 삽입
insert into public.announcements (id, title, host, category, deadline, location, details, image_url, apply_url, bid_amount)
values
-- 1 ~ 10번 (10종 기존 우수작/입찰 상위권 포함)
(
  'a1111111-1111-1111-1111-111111111111', 
  '넥슨 청소년 프로그래밍 챌린지 2026 (NYPC)', 
  '넥슨재단', 
  'IT/개발', 
  now() + interval '14 days', 
  '전국', 
  '넥슨의 대표 게임 IP를 활용해 창의적인 문제 해결 능력을 평가하는 청소년 전략 코딩 대회입니다. 12세부터 19세 청소년 누구나 참여 가능하며 본선은 판교 넥슨 사옥에서 개최됩니다.', 
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=600&auto=format&fit=crop', 
  'https://www.nypc.co.kr', 
  15000
),
(
  'a2222222-2222-2222-2222-222222222222', 
  '제43회 한국정보올림피아드 경시부문 (KOI 2026)', 
  '한국정보과학회', 
  'IT/개발', 
  now() + interval '5 days', 
  '전국', 
  '국내 최고의 권위를 자랑하는 컴퓨터 알고리즘 프로그래밍 대회입니다. 우수 학생들은 국제정보올림피아드(IOI) 대한민국 대표 후보 자격을 획득하게 됩니다.', 
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=600&auto=format&fit=crop', 
  'https://koi.or.kr', 
  10000
),
(
  'a3333333-3333-3333-3333-333333333333', 
  '삼성 주니어 SW 창작대회 2026', 
  '삼성전자', 
  'IT/개발', 
  now() + interval '12 days', 
  '전국', 
  '소프트웨어로 만드는 더 나은 미래를 주제로, 생활 속 문제점을 발견하고 이를 해결할 창의적인 아이디어를 코딩으로 구현하는 해커톤 및 창작대회입니다. 삼성전자 임직원 멘토링이 무료 지원됩니다.', 
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=600&auto=format&fit=crop', 
  'https://www.juniorswcup.com', 
  8000
),
(
  'a4444444-4444-4444-4444-444444444444', 
  '제15회 한국청소년학술대회 (KSCY 2026)', 
  'KSCY 조직위원회 (연세대학교)', 
  '인문학', 
  now() + interval '10 days', 
  '서울', 
  '아시아 최대 청소년 학술 컨퍼런스로, 인문학, 사회과학, 자연과학 등 본인만의 연구 학술 논문 또는 연구 계획안을 발표하는 청소년 학술 교류 대회입니다.', 
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600&auto=format&fit=crop', 
  'https://kscy.org', 
  5000
),
(
  'a5555555-5555-5555-5555-555555555555', 
  '2026 대한민국 학생창의력 챔피언대회', 
  '특허청, 한국발명진흥회', 
  '창업', 
  now() + interval '20 days', 
  '전국', 
  '팀 단위로 참여하여 표현과제 및 즉석과제, 제작과제를 통해 창의적인 문제 해결력을 평가하고 협업 능력을 기르는 국내 최대 학생 발명 창의 대회입니다.', 
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop', 
  'https://www.ip-edu.net', 
  3000
),
(
  'a6666666-6666-6666-6666-666666666666', 
  '2026 YIP 청소년 발명가 프로그램', 
  '특허청', 
  '창업', 
  now() + interval '8 days', 
  '전국', 
  '중·고등학생 대상의 아이디어 구체화 및 지식재산(특허) 출원 지원 교육 공모전입니다. 변리사 등 전문가 멘토링이 무료로 제공됩니다.', 
  'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?q=80&w=600&auto=format&fit=crop', 
  'https://www.ip-edu.net/yip', 
  2000
),
(
  'a7777777-7777-7777-7777-777777777777', 
  '제26회 대한민국 독서토론·논술대회', 
  '전국독서새물결모임', 
  '문학/수기', 
  now() + interval '3 days', 
  '강원', 
  '초·중·고등학생 대상의 전국 단위 독서 및 토론, 논술 경진대회로 인문 사회적 소양과 논리력을 겨룹니다.', 
  'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=600&auto=format&fit=crop', 
  'http://www.read365.eduniety.net', 
  0
),
(
  'a8888888-8888-8888-8888-888888888888', 
  '한국 과학영재 과학전람회 (KSEF 2026)', 
  '한국과학기술지원단', 
  '수학/과학', 
  now() + interval '25 days', 
  '전국', 
  '청소년들이 수학, 물리, 화학, 지구과학, 환경 등 다양한 분야의 과학 프로젝트를 탐구하고 발표하는 최고 권위의 과학 연구 발표 대회입니다.', 
  'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop', 
  'http://www.ksef.or.kr', 
  0
),
(
  'a9999999-9999-9999-9999-999999999999', 
  'LG 생활건강 청소년 기후활동가 공모전', 
  'LG생활건강', 
  '봉사활동', 
  now() + interval '15 days', 
  '경기', 
  '지역 사회의 기후 환경 문제를 고민하고 직접 실천할 수 있는 환경 보호 기후 행동 아이디어 및 캠페인 공모전입니다.', 
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=600&auto=format&fit=crop', 
  'http://www.lghnh.com', 
  0
),
(
  'a1010101-1010-1010-1010-101010101010', 
  '전국 청소년 영어 토론 대회 (YDT 2026)', 
  '한국영어교육평가원', 
  '외국어/어학', 
  now() + interval '9 days', 
  '서울', 
  '전국 중고등학생 대상 의회식 영어 토론 대회로, 글로벌 이슈에 대한 논리적 주장 전개와 영작/스피치 역량을 종합 평가합니다.', 
  'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=600&auto=format&fit=crop', 
  'https://www.ydt.or.kr', 
  0
),
-- 11 ~ 20번
(
  'a1111111-1111-1111-1111-222222222222',
  '제18회 한국 코드페어 (Korea Code Fair)',
  '과학기술정보통신부',
  'IT/개발',
  now() + interval '18 days',
  '전국',
  '우리 주변의 사회 문제를 해결하는 소프트웨어 소프트웨어 공모전 및 해커톤 대회로 주니어 SW인재를 발굴합니다.',
  'https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=600&auto=format&fit=crop',
  'https://kocodefair.kr',
  12000
),
(
  'a1222222-2222-2222-2222-333333333333',
  '한화 사이언스 챌린지 2026 (Hanwha Science Challenge)',
  '한화그룹',
  '수학/과학',
  now() + interval '30 days',
  '전국',
  '지구 구조(Saving the Earth)를 주제로 하는 고등학생 대상의 기초과학 탐구 공모전으로, 총 상금 2억원 규모의 권위있는 과학 공모전입니다.',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=600&auto=format&fit=crop',
  'https://www.sciencechallenge.or.kr',
  9000
),
(
  'a1333333-3333-3333-3333-444444444444',
  '제28회 전국 학생 통계활용대회',
  '통계청',
  '수학/과학',
  now() + interval '22 days',
  '전국',
  '통계 포스터 작성을 통해 문제 해결력을 함양하는 수학/과학 공모전입니다. 초중고등학생의 통계 리터러시를 겨룹니다.',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=600&auto=format&fit=crop',
  'https://www.statcontest.or.kr',
  0
),
(
  'a1444444-4444-4444-4444-555555555555',
  '제24회 대한민국 청소년 영화제 (KYFF)',
  '한국청소년영상예술진흥원',
  '미디어/영상',
  now() + interval '40 days',
  '경기',
  '미래의 영상 인재들을 위한 최대 청소년 영화제입니다. 중·고등학생 및 대학생 연령대의 청소년이 직접 연출하고 촬영한 단편 영화를 공모합니다.',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop',
  'http://www.kyff.com',
  0
),
(
  'a1555555-5555-5555-5555-666666666666',
  '제47회 전국 학생 과학발명품경진대회',
  '국립중앙과학관',
  '수학/과학',
  now() + interval '45 days',
  '전국',
  '청소년들이 창의적인 발명 아이디어를 구체적인 작품으로 제작하여 발명 역량과 문제 해결력을 키울 수 있도록 지원하는 최고 권위 발명 공모전입니다.',
  'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=600&auto=format&fit=crop',
  'https://www.science.go.kr',
  0
),
(
  'a1666666-6666-6666-6666-777777777777',
  '제72회 전국과학전람회',
  '과학기술정보통신부',
  '수학/과학',
  now() + interval '50 days',
  '전국',
  '물리, 화학, 생물, 지구과학 등 총 8개 부문에서 기초 과학 연구 프로젝트를 수행하여 평가받는 역사 깊은 전국 전람회입니다.',
  'https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=600&auto=format&fit=crop',
  'https://www.science.go.kr',
  0
),
(
  'a1777777-7777-7777-7777-888888888888',
  '제21회 전국 고등학생 경제한마당',
  '기획재정부',
  '기획/아이디어',
  now() + interval '17 days',
  '전국',
  '청소년들의 합리적인 경제적 사고방식 배양과 미래 금융리더를 양성하기 위한 고등학교 대표 종합 경제 능력 평가 경시대회입니다.',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=600&auto=format&fit=crop',
  'https://www.kdi.re.kr',
  0
),
(
  'a1888888-8888-8888-8888-999999999999',
  '제22회 전국 고등학생 지리올림피아드',
  '대한지리학회',
  '인문학',
  now() + interval '26 days',
  '전국',
  '지리적 분석력과 글로벌 역량을 평가하는 대회로, 전국 고등학생을 대상으로 지역 및 전국 본선으로 나뉘어 치뤄집니다.',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
  'http://www.geography.or.kr',
  0
),
(
  'a1999999-9999-9999-9999-101010101010',
  '제28회 전국 중고생 자원봉사대회',
  '한국중등교장협의회',
  '봉사활동',
  now() + interval '35 days',
  '전국',
  '자발적인 봉사활동을 통해 사회적 책임감과 나눔 정신을 실천한 청소년 봉사자를 발굴하여 시상하는 프로그램입니다.',
  'https://images.unsplash.com/photo-1469571486040-0b9b1757f520?q=80&w=600&auto=format&fit=crop',
  'https://www.spirit.or.kr',
  7000
),
(
  'a2020202-2020-2020-2020-202020202020',
  '2026 대한민국 청소년 발명 아이디어 경진대회',
  '한국대학발명협회',
  '창업',
  now() + interval '21 days',
  '전국',
  '청소년들의 지식재산에 대한 관심 제고와 실용적이고 창의적인 지식창업 아이디어를 발명 특허 연계로 확장 지원하는 공모전입니다.',
  'https://images.unsplash.com/photo-1553876005-af1262f743c5?q=80&w=600&auto=format&fit=crop',
  'https://www.invent.or.kr',
  0
),
-- 21 ~ 30번
(
  'a2121212-2121-2121-2121-212121212121',
  '제20회 전국 청소년 모의재판 경연대회',
  '법무부',
  '인문학',
  now() + interval '31 days',
  '전국',
  '법적 사고와 논리적 주장 전개를 겨루는 모의재판 경연으로, 중고등학생들이 팀을 이루어 민사/형사 모의재판 대본을 구성하여 진행합니다.',
  'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=600&auto=format&fit=crop',
  'https://www.lawedu.go.kr',
  0
),
(
  'a2222222-2222-2222-3333-333333333333',
  '제22회 대한민국청소년박람회 디지털 콘텐츠 경진대회',
  '여성가족부',
  '미디어/영상',
  now() + interval '42 days',
  '전국',
  '생성형 AI 기술 등을 적용하여 미래 사회의 기회와 도전을 보여주는 1분 숏폼 및 디지털 영상 콘텐츠 제작 대회입니다.',
  'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=600&auto=format&fit=crop',
  'https://www.kywa.or.kr',
  4000
),
(
  'a2323232-2323-2323-2323-232323232323',
  '제19회 전국 청소년 저작권 글짓기 대회',
  '문화체육관광부',
  '문학/수기',
  now() + interval '16 days',
  '전국',
  '저작권의 가치와 창작자의 권리 보호를 주제로 자유롭게 작성하는 수필/글짓기 대회로, 청소년 저작권 인식을 고양시킵니다.',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600&auto=format&fit=crop',
  'https://www.copyright.or.kr',
  0
),
(
  'a2424242-2424-2424-2424-242424242424',
  '제56회 전국 청소년 세금문예작품 공모전',
  '국세청',
  '문학/수기',
  now() + interval '29 days',
  '전국',
  '일상 속 세금의 가치와 필요성을 글, 포스터 등으로 표현하는 청소년 대표 세금 교육 공모 프로그램입니다.',
  'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?q=80&w=600&auto=format&fit=crop',
  'https://www.nts.go.kr',
  0
),
(
  'a2525252-2525-2525-2525-252525252525',
  '제16회 한국 청소년 뇌과학 올림피아드 (Brain Bee)',
  '한국뇌연구원',
  '수학/과학',
  now() + interval '27 days',
  '대구',
  '뇌과학 이론 지식을 종합적으로 평가하는 경시 분야 대회로, 우수자는 국제 뇌과학올림피아드 국가대표 후보군이 됩니다.',
  'https://images.unsplash.com/photo-1507668077129-56e32842fceb?q=80&w=600&auto=format&fit=crop',
  'http://www.brainbee.or.kr',
  0
),
(
  'a2626262-2626-2626-2626-262626262626',
  '임베디드 소프트웨어 경진대회 2026 (주니어 부문)',
  '산업통상자원부',
  'IT/개발',
  now() + interval '48 days',
  '전국',
  '초중고등학생들의 임베디드 코딩 능력 개발을 지원하며 자율주행 모형차 코딩 미션과 창의 아이디어를 시연하는 소프트웨어 경진대회입니다.',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600&auto=format&fit=crop',
  'http://www.embeddedcontest.or.kr',
  0
),
(
  'a2727272-2727-2727-2727-272727272727',
  '제25회 한국중학생물리대회 (KPhO)',
  '한국물리학회',
  '수학/과학',
  now() + interval '11 days',
  '전국',
  '전국 중학생을 대상으로 물리적 사고력과 문제 해결 역량을 종합적으로 겨루는 역사와 신뢰를 보유한 물리 경시대회입니다.',
  'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?q=80&w=600&auto=format&fit=crop',
  'https://kpho.kps.or.kr',
  0
),
(
  'a2828282-2828-2828-2828-282828282827',
  '제29회 한국화학올림피아드 (KChO)',
  '대한화학회',
  '수학/과학',
  now() + interval '13 days',
  '전국',
  '중·고등학교 인재들의 화학적 재능 발굴을 목적으로 하는 최고 권위의 시험 중심 화학 전문 학술 대회입니다.',
  'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?q=80&w=600&auto=format&fit=crop',
  'https://kcho.kcsnet.or.kr',
  0
),
(
  'a2929292-2929-2929-2929-292929292929',
  '제27회 한국생물올림피아드 (KBO)',
  '한국생물과학협회',
  '수학/과학',
  now() + interval '19 days',
  '전국',
  '유전, 분류, 생태 등 기초 생물학과 응용 생명과학에 대한 깊은 지식을 기르고 능력을 검정받는 대회입니다.',
  'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?q=80&w=600&auto=format&fit=crop',
  'http://www.kibo.or.kr',
  0
),
(
  'a3030303-3030-3030-3030-303030303030',
  '제23회 한국지구과학올림피아드 (KESO)',
  '한국지구과학회',
  '수학/과학',
  now() + interval '24 days',
  '전국',
  '대기, 지질, 해양, 우주 분야에 이르기까지 지구적 환경과 과학 시스템에 대한 청소년 인재들의 실력을 테스트하는 공모 및 시험입니다.',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
  'http://www.keso.or.kr',
  0
),
-- 31 ~ 40번
(
  'a3131313-3131-3131-3131-313131313131',
  '제24회 한국천문올림피아드 (KAO)',
  '한국천문학회',
  '수학/과학',
  now() + interval '34 days',
  '전국',
  '전국의 고등학교 및 중학교 학생을 위한 천문학 이론 및 우주 관측 경시대회로 우주과학 핵심 인재를 선발합니다.',
  'https://images.unsplash.com/photo-1454789548928-9efd52dc4031?q=80&w=600&auto=format&fit=crop',
  'http://www.kao.or.kr',
  0
),
(
  'a3232323-3232-3232-3232-323232323232',
  '한국 청소년 물 포럼 2026 (Korea Junior Water Prize)',
  '한국물포럼',
  '수학/과학',
  now() + interval '33 days',
  '전국',
  '수질 보전 및 수자원 보호에 관련된 청소년들의 기발한 과학적 해결 방안 논문 및 포스터 발표 대회로, 우수자는 스웨덴 국제대회 출전권이 부여됩니다.',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=600&auto=format&fit=crop',
  'http://www.kjwp.or.kr',
  0
),
(
  'a3333333-3333-3333-4444-444444444444',
  '전국 청소년 스마트폰 영화제 (KYSF)',
  '영화진흥위원회',
  '미디어/영상',
  now() + interval '54 days',
  '전국',
  '오로지 스마트폰으로 제작한 창의적 10분 이내 스마트폰 단편영화 예술 공모로 청소년의 재치있는 영상 미디어를 심사합니다.',
  'https://images.unsplash.com/photo-1512070679279-8988d32161be?q=80&w=600&auto=format&fit=crop',
  'http://www.kysf.kr',
  0
),
(
  'a3434343-3434-3434-3434-343434343434',
  '제20회 전국 청소년 국악경연대회',
  '국립국악원',
  '미술/디자인',
  now() + interval '28 days',
  '전국',
  '판소리, 기악, 무용에 걸쳐 청소년 인재들의 수준 높은 기량을 겨루고 문화 예술적 감각을 발굴하는 종합 예술 대회입니다.',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop',
  'http://www.gugak.go.kr',
  0
),
(
  'a3535353-3535-3535-3535-353535353535',
  '2026 전국 청소년 댄스 경연대회',
  '한국문화예술협회',
  '미술/디자인',
  now() + interval '15 days',
  '서울',
  '중·고등학교 댄스 동아리 및 개인 청소년들의 자유로운 스트릿 댄스, 퍼포먼스 실력을 뽐내는 예술 축제이자 공모 경연입니다.',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=600&auto=format&fit=crop',
  'http://www.youthdance.or.kr',
  0
),
(
  'a3636363-3636-3636-3636-363636363636',
  '제21회 전국 청소년 숲사랑 작품공모전',
  '산림청',
  '미술/디자인',
  now() + interval '38 days',
  '전국',
  '자연 환경 보호와 숲에 대한 사랑을 글짓기 및 그림(미술)으로 표현하여 제출하는 자연 친화 감성 공모전입니다.',
  'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop',
  'http://www.forest.go.kr',
  0
),
(
  'a3737373-3737-3737-3737-373737373737',
  '2026 전국 고등학생 디자인 실기대회',
  '경희대학교',
  '미술/디자인',
  now() + interval '9 days',
  '경기',
  '디자인 기초조형디자인 및 사고의 전환 부문 디자인 실기 실력을 대학 고사장에서 동일하게 겨루는 실기공모 대회입니다.',
  'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop',
  'https://www.khu.ac.kr',
  6000
),
(
  'a3838383-3838-3838-3838-383838383838',
  '제34회 대한민국 고등학교 디자인 공모전',
  '한국미술협회',
  '미술/디자인',
  now() + interval '44 days',
  '전국',
  '시각, 산업, 패션, 인테리어 디자인 분야에서 우수한 재능을 지닌 미래의 시각예술 디자이너 지망생들을 위한 공모전입니다.',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop',
  'http://www.artdesign.co.kr',
  0
),
(
  'a3939393-3939-3939-3939-393939393939',
  '제20회 전국 중고등학생 다문화 교육 우수사례 공모전',
  '교육부',
  '인문학',
  now() + interval '49 days',
  '전국',
  '다문화에 대한 편견 해소와 올바른 다양성 존중 문화를 실천한 청소년들의 우수 극복 및 봉사활동, 글짓기 사례를 공모합니다.',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=600&auto=format&fit=crop',
  'http://www.multiculture.or.kr',
  0
),
(
  'a4040404-4040-4040-4040-404040404040',
  '2026 청소년 평화통일 글짓기·토론대회',
  '민주평화통일자문회의',
  '문학/수기',
  now() + interval '51 days',
  '전국',
  '한반도의 미래 평화와 통일에 대한 청소년들의 열정과 지식을 기르는 에세이(글짓기) 및 토론 공모전입니다.',
  'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?q=80&w=600&auto=format&fit=crop',
  'http://www.nuac.go.kr',
  0
),
-- 41 ~ 50번
(
  'a4141414-4141-4141-4141-414141414141',
  '제12회 전국 청소년 환경 글짓기/그림 공모전',
  '환경부',
  '문학/수기',
  now() + interval '23 days',
  '전국',
  '환경 오염의 심각성을 알리고 생활 속 제로웨이스트(탄소저감) 환경 실천 방안에 관한 아이디어를 담은 작품 공모전입니다.',
  'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?q=80&w=600&auto=format&fit=crop',
  'http://www.environ.or.kr',
  0
),
(
  'a4242424-4242-4242-4242-424242424242',
  '제18회 전국 고등학생 토론대회',
  '중앙선거방송토론위원회',
  '인문학',
  now() + interval '36 days',
  '전국',
  '지정된 시사 논제에 대하여 찬반 토론을 벌여 논리적 비판력과 설득 및 스피치 커뮤니케이션 능력을 종합 평가하는 토론 대회입니다.',
  'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=600&auto=format&fit=crop',
  'http://www.debates.go.kr',
  0
),
(
  'a4343433-4343-4343-4343-434343434343',
  '2026 전국 청소년 적십자(RCY) 인도주의 공모전',
  '대한적십자사',
  '봉사활동',
  now() + interval '59 days',
  '전국',
  '생명 존중 및 인도주의 정신을 함양하고 봉사 경험에 관한 미디어 콘텐츠 및 포스터, 소감 수기를 접수하는 사회 환원 공모전입니다.',
  'https://images.unsplash.com/photo-1469571486040-0b9b1757f520?q=80&w=600&auto=format&fit=crop',
  'http://www.redcross.or.kr',
  0
),
(
  'a4444444-4444-4444-5555-555555555556',
  '제14회 전국 청소년 금연 영상/포스터 공모전',
  '보건복지부',
  '미디어/영상',
  now() + interval '61 days',
  '전국',
  '학교 내 간접 흡연 및 금연 실천을 유도하는 1분 숏폼 동영상 및 크리에이티브 지면 디자인 포스터 공모전입니다.',
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600&auto=format&fit=crop',
  'http://www.nosmoking.or.kr',
  0
),
(
  'a4545454-4545-4545-4545-454545454545',
  '2026 한국 청소년 로봇 경진대회',
  '한국로봇산업진흥원',
  'IT/개발',
  now() + interval '67 days',
  '전국',
  '로봇 코딩 및 하드웨어 제작 미션을 제한 시간 내에 해결하는 하이테크 미래 공학 경시대회로 고등부/중등부로 나뉘어 개최됩니다.',
  'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=600&auto=format&fit=crop',
  'http://www.robotcontest.or.kr',
  0
),
(
  'a4646464-4646-4646-4646-464646464646',
  '제26회 전국 고등학생 논술경시 대회',
  '성균관대학교',
  '문학/수기',
  now() + interval '12 days',
  '전국',
  '인문/사회 제반 이슈에 대해 비판적 성찰 및 인문학적 에세이 글짓기를 고사장에서 종합 검정하는 논술 전문 경시대회입니다.',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600&auto=format&fit=crop',
  'https://www.skku.edu',
  0
),
(
  'a4747474-4747-4747-4747-474747474747',
  '2026 전국 학생 디자인 공모전',
  '한국디자인진흥원',
  '미술/디자인',
  now() + interval '74 days',
  '전국',
  '기발한 아이디어를 가미한 친환경 및 편의 목적 제품/공간/UXUI 디자인 스케치 및 3D 그래픽을 공모 및 전시 지원합니다.',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop',
  'https://www.kidp.or.kr',
  0
),
(
  'a4848484-4848-4848-4848-484848484848',
  '제29회 전국 청소년 연극제',
  '한국연극협회',
  '미디어/영상',
  now() + interval '80 days',
  '전국',
  '청소년들이 직접 극작, 연출, 스태프로 활동하며 단체 연극 무대를 완성해 올리는 학원 극예술 경연 축제입니다.',
  'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=600&auto=format&fit=crop',
  'http://www.theatre.or.kr',
  0
),
(
  'a4949494-4949-4949-4949-494949494949',
  '2026 청소년 스마트 리더십 캠프 및 공모전',
  '한국스마트교육협회',
  '기획/아이디어',
  now() + interval '85 days',
  '전국',
  '디지털 트랜스포메이션과 리더십을 융합하여 미래의 기업가정신 모델을 기획 발표하는 종합 아카데미 및 해커톤 공모입니다.',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop',
  'http://www.leadership.or.kr',
  0
),
(
  'a5050505-5050-5050-5050-505050505050',
  '제12회 전국 고등학생 의회교실 및 토론대회',
  '국회사무처',
  '인문학',
  now() + interval '90 days',
  '서울',
  '의회 민주주의와 입법 과정을 배우며 현안 시사 정책 안건에 관해 직접 발언하고 모의 입법안을 상정하는 토론 경연 대회입니다.',
  'https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=80&w=600&auto=format&fit=crop',
  'http://www.assembly.go.kr',
  0
),
(
  'a5151515-5151-5151-5151-515151515151',
  '제7회 기상청 달콤기후 공모전',
  '기상청',
  '미술/디자인, 문학/수기, 미디어/영상',
  '2026-06-12 23:59:59',
  '전국',
  '[공모전 개요] 「제7회 기상청 달콤기후 공모전」 ⏰ 공모기간 : 2026년 4월 23일(목) ~ 6월 12일(금) 📂 공모분야: 디자인(그림🎨, 캘리그래피📜), 이야기💡(4행시), 영상💡(생성형 AI 숏폼) 📂 공모주제: ① 온실가스, ② 달콤기후, ③ 미래날씨 (달콤기후는 달달하고 매콤한 기후변화과학의 줄임말) 📂 참가 대상: 대한민국 국민 누구나(단체 제외, 개인별 최대 3작품) 📂 접수 방법: 기후정보포털(http://www.climate.go.kr/home/) 및 소통24(https://sotong.go.kr./front/main/index.do/)를 통한 구글폼 접수 📂 시상 내역: 총 40작품 선정, 총 상금 970만원 (대상: 기후에너지환경부장관상 디자인 200만 원, 이야기 50만 원 등) [세부사항] - 디자인(그림): 수채화, 서양화, 동양화, 일러스트 등 (10호F 이내) - 디자인(캘리그래피): 디지털 캘리그래피 등 (8절지) - 이야기(4행시): 기후위기 극복 희망 메시지 (1행당 20자 이내) - 영상(생성형 AI 숏폼): AI 영상 1분 내외 (1920x1080 이상 해상도) ※ 문의: 운영사무국 (Tel. 070-7039-4373, 4121)',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop',
  'https://forms.gle/fSoTT7abpi9c7ChN8',
  16000
);
