import { createContext } from 'react';

// 이 영역 안의 광고를 띄울지 (예: 상세 화면이 열려 뒤로 숨은 목록의 광고는 내린다)
export const AdScope = createContext<boolean>(true);
