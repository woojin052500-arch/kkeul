import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { captureReferralFromUrl } from './utils/deepLink'

// 추천 링크(?ref=코드)로 들어온 경우 코드를 기억해 둔다
captureReferralFromUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
