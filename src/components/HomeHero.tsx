import React from 'react';

// 홈 첫 화면 맨 위: 끌이 링커리어 같은 공고 모음과 무엇이 다른지 두 가지만 먼저 보여 준다.
// ① 구인글 없이 '나도 나갈래요' 한 번으로 팀 매칭 ② 학생 맞춤 추천 + 대회별 세특·활동 요약 초안
const POINTS = [
  "'나도 나갈래요' 한 번이면 매칭",
  '학생한테 딱 맞는 팀 짜기',
  '대회마다 세특·활동 요약 초안'
];

interface HomeHeroProps {
  // 비회원에게도 같은 문구를 보여 준다 (가입 안내는 아래 비회원 게이트가 이어 받는다)
  isGuest?: boolean;
}

export const HomeHero: React.FC<HomeHeroProps> = ({ isGuest = false }) => (
  <section className="home-hero" data-guest={isGuest ? 'true' : undefined} aria-labelledby="home-hero-title">
    <h2 id="home-hero-title">
      구인글 없이, 버튼 하나로<br />팀이 맺어져요
    </h2>
    <p>
      긴 모집글 쓸 필요 없어요. &lsquo;나도 나갈래요&rsquo;만 누르면 같은 대회 준비하는 학생들과
      바로 연결돼요. 눈치 볼 필요 없이 팀이 짜이고, 대회별 세특 요약도 함께 챙겨드려요.
    </p>
    <div className="home-hero-chips">
      {POINTS.map((point, i) => (
        <div key={point} className="home-hero-chip">
          <span className="home-hero-chip-no" aria-hidden="true">{i + 1}</span>
          {point}
        </div>
      ))}
    </div>
  </section>
);

export default HomeHero;
