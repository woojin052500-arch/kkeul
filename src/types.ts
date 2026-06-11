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
  contact: string;
  created_at: string;
}

export interface JoinRequest {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  created_at: string;
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
