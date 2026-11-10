export interface Profile {
  id: string;
  email: string;
  name: string;
  location: string;
  grade: string;
  school?: string;
  major?: string; // 목표 전공
  interests: string[];
  xp: number;
  badges: string[];
  role?: 'student' | 'host';
  contact?: string;
  created_at?: string;
  agreeDisclaimer?: boolean; // 면책 조항 동의 여부
  age_over14_confirmed?: boolean; // '만 14세 이상' 확인 체크 여부 (생년월일은 저장하지 않음)
  age_over14_confirmed_at?: string; // 체크한 시각
  terms_version?: string; // 동의한 이용약관 버전
  terms_agreed_at?: string;
  competency_consent?: boolean; // [선택] 역량 진단 정보 이용 동의
  competency_consent_at?: string;
  bio?: string;
  custom_theme?: string;
  phone_number?: string;
  social_links?: Record<string, string>;
  awards?: { title: string; date: string }[];
  portfolio_urls?: string[];
  play_style?: {
    team_size?: string;
    duration?: string;
    type?: string;
  };
}

export interface Announcement {
  source?: string | null; // 'contestkorea' 면 콘테스트코리아에서 받아온 공고
  source_id?: string | null;
  target?: string | null; // 참가 대상
  id: string;
  title: string;
  host: string;
  category: string;
  deadline: string;
  location: string;
  details: string;
  image_url: string;
  apply_url: string;
  bid_amount?: number;
  created_at?: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  announcement_id: string;
  created_at?: string;
}

export interface OnboardingState {
  email: string;
  location: string;
  grade: string;
  interests: string[];
}

export interface TeamPost {
  id: string;
  announcement_id: string;
  user_id: string;
  user_name: string;
  role_wanted: '기획' | '디자인' | '개발';
  my_role: '기획' | '디자인' | '개발';
  comment: string;
  contact?: string; // 예전 로컬 예시 데이터에만 있음. 연락처는 수락된 상대에게만 user_contacts 로 공개
  is_hidden?: boolean; // 신고되면 true
  created_at: string;
}

export interface JoinRequest {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  status?: 'pending' | 'accepted' | 'rejected';
  is_hidden?: boolean; // 신고되면 true
  created_at: string;
  updated_at?: string;
}

export interface ClubAnnouncement {
  id: string;
  school: string;
  club_name: string;
  title: string;
  details: string;
  tags: string[];
  deadline: string;
  image_url: string;
  created_at: string;
}

export interface ClubApplicant {
  id: string;
  club_id: string;
  user_id: string;
  user_name: string;
  user_school: string;
  user_grade: string;
  user_contact: string;
  user_skills: string[];
  user_awards: { contestName: string; prize: string }[];
  introduction_summary: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface PeerEndorsement {
  id: string;
  receiver_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export interface UserFriend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
}
