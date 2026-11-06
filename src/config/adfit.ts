// 카카오 AdFit 광고 단위 코드 (웹 전용 — 앱에는 광고를 넣지 않음)
// 새로 발급받으면 이 파일의 값만 바꾸면 됩니다.
// AdFit 관리 화면 → 매체(웹: kkeul.telosix.co.kr) → 광고 단위에서 "DAN-..." 코드를 복사하세요.
export const ADFIT_UNITS = {
  // 스와이프 카드 사이에 들어가는 250x250 광고
  swipeCard250: 'DAN-V9hsnH4cMSNICaii',
  // 리스트 뷰 중간의 320x100 배너 (첫 번째)
  listBanner100: 'DAN-EdZGhdPNNZvANVdn',
  // 리스트 뷰 중간의 320x100 배너 (두 번째)
  listBanner100Second: 'DAN-nADIaKSVsknAYWek'
} as const;
