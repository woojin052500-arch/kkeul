// 카카오 AdFit 광고 설정 (웹 전용 — 앱에는 광고를 넣지 않음)
// 광고 단위 코드는 AdFit 관리 화면 → 매체(웹: kkeul.telosix.co.kr) → 광고 단위에서 복사하세요.
// AdFit은 등록한 매체 주소에서만 광고를 보내 줍니다. (kkeul.vercel.app 에서는 안 나옴)
export const ADFIT_UNITS = {
  // 250x250
  swipeCard250: 'DAN-9cdumPTWM5TLTNUu',
  // 320x100
  banner100A: 'DAN-vOOWAlKdUi0PKHLC',
  // 320x100
  banner100B: 'DAN-BqngMFgug66OM04c'
} as const;

export type AdUnitKey = keyof typeof ADFIT_UNITS;

// 광고 자리 → 쓸 광고 단위.
// 같은 광고 단위가 한 화면에 두 번 뜨지 않도록 화면마다 A/B를 나눠 씁니다.
// 광고 단위를 더 발급받으면 ADFIT_UNITS 에 추가하고 여기서 자리별로 바꿔 주면 됩니다.
export const AD_PLACEMENTS = {
  homeSwipeDeck: 'swipeCard250', // 홈 스와이프: 카드 6장마다 1장
  homeSwipeBelow: 'banner100A', // 홈 스와이프: 카드 버튼 아래
  homeListFirst: 'banner100A', // 홈 리스트: 4번째 공고 뒤
  homeListSecond: 'banner100B', // 홈 리스트: 12번째 공고 뒤
  calendar: 'banner100A', // 캘린더 탭 아래
  bookmarks: 'banner100B', // 보관함 목록 아래
  club: 'banner100A', // 동아리 탭 아래
  partners: 'banner100B', // 파트너 탭 아래
  detail: 'banner100B' // 공고 상세: 모집 요강과 팀 빌딩 사이
} as const satisfies Record<string, AdUnitKey>;

export type AdPlacement = keyof typeof AD_PLACEMENTS;
