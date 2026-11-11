import React, { useEffect, useState } from 'react';
import { Lock, Users } from 'lucide-react';
import { db } from '../supabaseClient';

interface GuestTeamTeaserProps {
  announcementId: string;
  onRequireLogin: (reason: string) => void;
}

// 비회원에게 보여 주는 팀 빌딩 안내. 구인글 내용은 보여 주지 않고 개수만 알려 준다.
export const GuestTeamTeaser: React.FC<GuestTeamTeaserProps> = ({ announcementId, onRequireLogin }) => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    db.getTeamPostCount(announcementId)
      .then((n) => alive && setCount(n))
      .catch(() => alive && setCount(null));
    return () => {
      alive = false;
    };
  }, [announcementId]);

  return (
    <div id="team-board" className="guest-team">
      <h3><Users size={16} color="var(--color-indigo)" /> 대회 팀 빌딩</h3>
      <p>
        {count && count > 0
          ? <>이 대회에 팀원을 구하는 글이 <strong>{count.toLocaleString()}개</strong> 있어요.</>
          : <>이 대회에 같이 나갈 팀원을 구해 보세요.</>}
        {' '}기획·개발·디자인 역할로 팀원을 찾고, 합류를 요청할 수 있어요.
      </p>
      <button type="button" className="btn btn-primary" onClick={() => onRequireLogin('팀원 모집 글은 가입한 회원만 볼 수 있어요.')}>
        <Lock size={14} /> 가입하고 팀원 찾기
      </button>
    </div>
  );
};
