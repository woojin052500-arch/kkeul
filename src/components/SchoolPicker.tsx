import React, { useEffect, useId, useState } from 'react';
import { Check, Search } from 'lucide-react';

interface School {
  name: string;
  kind: string;
  region: string;
  code: string;
}

interface SchoolPickerProps {
  value: string;
  onChange: (schoolName: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}

// 학교를 검색해서 고른다 (교육부 나이스 학교 정보). 목록에 없으면 입력한 이름을 그대로 쓸 수 있다.
export const SchoolPicker: React.FC<SchoolPickerProps> = ({ value, onChange, autoFocus, placeholder = '학교 이름으로 검색 (예: 하나고)' }) => {
  const listId = useId();
  const [text, setText] = useState(value);
  const [results, setResults] = useState<School[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const query = text.trim();
  const picked = value !== '' && value === query;

  useEffect(() => {
    if (picked || query.length < 2) return;
    let alive = true;
    const t = window.setTimeout(() => {
      setStatus('loading');
      fetch(`/api/schools?q=${encodeURIComponent(query)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d: { schools?: School[] }) => {
          if (!alive) return;
          setResults(Array.isArray(d.schools) ? d.schools : []);
          setStatus('done');
        })
        .catch(() => {
          if (!alive) return;
          setResults([]);
          setStatus('error');
        });
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [query, picked]);

  const choose = (name: string) => {
    setText(name);
    onChange(name);
  };

  const showList = !picked && query.length >= 2;

  return (
    <div className="school-picker">
      <div className="school-picker-input">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={text}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="학교 검색"
          aria-controls={listId}
          autoComplete="off"
          onChange={(e) => {
            setText(e.target.value);
            if (value) onChange(''); // 글자를 고치면 다시 골라야 한다
          }}
        />
        {picked && <Check size={16} color="var(--color-indigo)" aria-label="선택됨" />}
      </div>

      {!picked && query.length < 2 && <p className="school-picker-hint">두 글자 이상 입력하면 학교를 찾아 드려요.</p>}

      {showList && (
        <ul id={listId} className="school-picker-list">
          {status === 'loading' && results.length === 0 && <li className="school-picker-note">찾는 중…</li>}
          {results.map((s) => (
            <li key={s.code || `${s.name}-${s.region}`}>
              <button type="button" onClick={() => choose(s.name)}>
                <strong>{s.name}</strong>
                <span>{[s.region, s.kind].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
          {status === 'done' && results.length === 0 && <li className="school-picker-note">검색된 학교가 없어요.</li>}
          {status === 'error' && <li className="school-picker-note">학교 목록을 불러오지 못했어요.</li>}
          {(status === 'done' || status === 'error') && (
            <li>
              <button type="button" className="school-picker-manual" onClick={() => choose(query)}>
                목록에 없어요 · <strong>'{query}'</strong> 그대로 쓰기
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
