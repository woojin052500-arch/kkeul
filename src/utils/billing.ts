import { Capacitor } from '@capacitor/core';

// ──────────────────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────────────────

export interface BillingProduct {
  productId: string;
  title: string;
  description: string;
  price: string;              // 예: "₩4,900"
  priceAmountMicros: number;  // 마이크로 단위 (4900000000 = ₩4,900)
  priceCurrencyCode: string;  // 예: "KRW"
}

export interface BillingPurchase {
  orderId: string;
  purchaseToken: string;
  purchaseState: number;      // 1 = PURCHASED
  isAcknowledged: boolean;
  products: string[];         // productId 배열
}

export type PurchaseResult =
  | { success: true;  purchase: BillingPurchase }
  | { success: false; cancelled: boolean; error: string };

// ──────────────────────────────────────────────────────────
// 내부 헬퍼
// ──────────────────────────────────────────────────────────

function getPlugin() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugins = (window as any).Capacitor?.Plugins as Record<string, unknown> | undefined;
  if (!plugins || !plugins['KkeulBilling']) return undefined;
  return plugins['KkeulBilling'] as {
    queryProducts(opts: { productIds: string[] }): Promise<{ products: BillingProduct[] }>;
    purchase(opts: { productId: string }): Promise<{ purchase: BillingPurchase }>;
    restorePurchases(): Promise<{ purchases: BillingPurchase[] }>;
  };
}

const isAndroid = () => Capacitor.getPlatform() === 'android';

// ──────────────────────────────────────────────────────────
// 공개 API
// ──────────────────────────────────────────────────────────

/**
 * Google Play에서 제품 목록 조회
 * @param productIds  Play Console에 등록된 Product ID 배열
 */
export async function queryProducts(productIds: string[]): Promise<BillingProduct[]> {
  if (!isAndroid()) return [];
  const plugin = getPlugin();
  if (!plugin) throw new Error('KkeulBilling plugin not available');
  const { products } = await plugin.queryProducts({ productIds });
  return products;
}

/**
 * 결제 시트를 열고 결제 진행
 * @param productId  구매할 제품의 Play Console Product ID
 */
export async function purchase(productId: string): Promise<PurchaseResult> {
  if (!isAndroid()) {
    return { success: false, cancelled: false, error: 'Not on Android' };
  }
  const plugin = getPlugin();
  if (!plugin) return { success: false, cancelled: false, error: 'KkeulBilling plugin not available' };

  try {
    const { purchase: p } = await plugin.purchase({ productId });
    return { success: true, purchase: p };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const cancelled = msg === 'USER_CANCELED';
    return { success: false, cancelled, error: msg };
  }
}

/**
 * 이전에 구매한 항목 복원 (재설치 시 등에 활용)
 */
export async function restorePurchases(): Promise<BillingPurchase[]> {
  if (!isAndroid()) return [];
  const plugin = getPlugin();
  if (!plugin) throw new Error('KkeulBilling plugin not available');
  const { purchases } = await plugin.restorePurchases();
  return purchases;
}

// ──────────────────────────────────────────────────────────
// 제품 ID 상수 (Play Console에 등록된 ID와 일치해야 함)
// ──────────────────────────────────────────────────────────

export const PRODUCT_IDS = {
  /** 끌 프리미엄 멤버십 — 1회 구매 영구 활성화 */
  PREMIUM: 'kkeul_premium',
  /** 공모전 상단 부스트 1회 티켓 */
  BOOST_TICKET: 'kkeul_boost_ticket',
  /** 팀 매칭 우선 노출권 */
  TEAM_PRIORITY: 'kkeul_team_priority',
} as const;
