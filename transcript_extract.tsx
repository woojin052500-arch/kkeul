        )}

        {/* STEP 4: Terms & Agreements (Signup only) */}
        {step === 4 && mode === 'signup' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, whiteSpace: 'pre-wrap', lineHeight: 1.4, marginBottom: '8px' }}>
              끌에 오신 것을 환영합니다
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Kkeul의 맞춤 큐레이션 추천을 받기 위해 아래 약관에 동의해 주세요.
            </p>

            {/* WJedulab Security Badge Card */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              borderRadius: '16px',
              backgroundColor: '#FAFBFC',
              border: '1px solid #E5E8EB',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-indigo)',
                flexShrink: 0
    
<truncated 36418 bytes>
ize: '19px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', textAlign: 'left' }}>
              {activeDetailTerm === 'age' && '만 14세 이상 확인'}
              {activeDetailTerm === 'terms' && 'Kkeul 서비스 이용약관'}
              {activeDetailTerm === 'privacy' && '개인정보 수집 및 이용 동의'}
              {activeDetailTerm === 'overseas' && '개인정보 국외 이전 동의'}
              {activeDetailTerm === 'competency' && '역량 데이터 수집 관련 동의'}
              {activeDetailTerm === 'disclaimer' && '대회/공모전 및 프로젝트 참여 플랫폼 면책 조항'}
            </h2>

            {/* Quick Summary Card */}
            {activeDetailTerm === 'terms' && (
              <div style={{
                backgroundColor: 'rgba(79, 70, 229, 0.05)',
                border: '1px solid rgba(79, 70, 229, 0.1)',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '13px',
                color: 'var(--color-indigo)',
                lineHeight: 1.45,
                textAlign: 'left'
              }}>
                <strong>💡 핵심 약관 조항 요약</strong>
                <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                  <li>제2조 2항: 타 기관으로부터 학생 정보를 절대 무단 수집하지 않습니다.</li>
                  <li>제3조 2항: 불가항력적인 해킹이나 천재지변 등에 대한 면책 사항을 규정합니다.</li>
                  <li>제4조: 청소년을 위해 상업성/유해 정보 필터링 및 사전 검수를 성실히 보장합니다.</li>
The above content d