import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

// 렌더링 중 오류가 나면 흰 화면 대신 오류 내용과 복구 버튼을 보여준다.
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info.componentStack);
  }

  private resetAndReload = () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('kkeul'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // storage unavailable; reload anyway
    }
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#F7F7F8', fontFamily: 'var(--font-family, system-ui, sans-serif)' }}>
        <div style={{ width: '100%', maxWidth: '360px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '24px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>화면을 불러오지 못했어요</h1>
          <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#4B5563', margin: '0 0 16px' }}>
            저장된 데이터를 초기화하면 대부분 해결돼요. 다시 로그인해야 할 수 있어요.
          </p>
          <pre style={{ fontSize: '11px', lineHeight: 1.4, color: '#6B7280', background: '#F3F4F6', borderRadius: '8px', padding: '10px', margin: '0 0 16px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '140px', overflow: 'auto' }}>
            {error.message}
          </pre>
          <button onClick={this.resetAndReload} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '10px', background: '#4F46E5', color: '#FFFFFF', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
            초기화 후 다시 시작
          </button>
        </div>
      </div>
    );
  }
}
