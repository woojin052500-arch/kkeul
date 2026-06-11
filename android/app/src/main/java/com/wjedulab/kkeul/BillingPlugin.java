package com.wjedulab.kkeul;

import android.util.Log;

import androidx.annotation.NonNull;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

/**
 * KkeulBilling — Capacitor 네이티브 인앱 결제 플러그인
 *
 * 웹(JS)에서 호출 방법:
 *   import { Capacitor } from '@capacitor/core';
 *   const { KkeulBilling } = Capacitor.Plugins;
 *   await KkeulBilling.purchase({ productId: 'kkeul_premium' });
 */
@CapacitorPlugin(name = "KkeulBilling")
public class BillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private static final String TAG = "KkeulBilling";

    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall = null;

    // ──────────────────────────────────────────────
    // 라이프사이클
    // ──────────────────────────────────────────────

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .build();
    }

    /** BillingClient를 연결하고 연결 완료 후 콜백 */
    private void connectIfNeeded(Runnable onConnected) {
        if (billingClient.isReady()) {
            onConnected.run();
            return;
        }
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    onConnected.run();
                } else {
                    Log.e(TAG, "Billing setup failed: " + result.getDebugMessage());
                }
            }
            @Override
            public void onBillingServiceDisconnected() {
                Log.w(TAG, "Billing service disconnected");
            }
        });
    }

    // ──────────────────────────────────────────────
    // JS ↔ Native 메서드
    // ──────────────────────────────────────────────

    /**
     * 제품 정보 조회
     * JS: KkeulBilling.queryProducts({ productIds: ['kkeul_premium'] })
     */
    @PluginMethod
    public void queryProducts(PluginCall call) {
        JSArray productIdArr = call.getArray("productIds");
        if (productIdArr == null || productIdArr.length() == 0) {
            call.reject("productIds is required");
            return;
        }

        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        try {
            for (int i = 0; i < productIdArr.length(); i++) {
                productList.add(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productIdArr.getString(i))
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build()
                );
            }
        } catch (Exception e) {
            call.reject("Invalid productIds: " + e.getMessage());
            return;
        }

        connectIfNeeded(() -> {
            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                    .setProductList(productList)
                    .build();

            billingClient.queryProductDetailsAsync(params, (billingResult, result) -> {
                List<ProductDetails> productDetailsList = result.getProductDetailsList();
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("queryProducts failed: " + billingResult.getDebugMessage());
                    return;
                }
                JSArray results = new JSArray();
                if (productDetailsList != null) {
                    for (ProductDetails pd : productDetailsList) {
                        JSObject obj = new JSObject();
                        obj.put("productId", pd.getProductId());
                        obj.put("title", pd.getTitle());
                        obj.put("description", pd.getDescription());
                        // 일회성 제품 가격
                        ProductDetails.OneTimePurchaseOfferDetails offer = pd.getOneTimePurchaseOfferDetails();
                        if (offer != null) {
                            obj.put("price", offer.getFormattedPrice());
                            obj.put("priceAmountMicros", offer.getPriceAmountMicros());
                            obj.put("priceCurrencyCode", offer.getPriceCurrencyCode());
                        }
                        results.put(obj);
                    }
                }
                JSObject ret = new JSObject();
                ret.put("products", results);
                call.resolve(ret);
            });
        });
    }

    /**
     * 결제 실행
     * JS: KkeulBilling.purchase({ productId: 'kkeul_premium' })
     */
    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null || productId.isEmpty()) {
            call.reject("productId is required");
            return;
        }

        connectIfNeeded(() -> {
            // 먼저 제품 상세 정보 조회 후 결제 시트 실행
            List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
            productList.add(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            );

            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                    .setProductList(productList)
                    .build();

            billingClient.queryProductDetailsAsync(params, (billingResult, result) -> {
                List<ProductDetails> productDetailsList = result.getProductDetailsList();
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK
                        || productDetailsList == null || productDetailsList.isEmpty()) {
                    call.reject("Product not found: " + productId);
                    return;
                }

                ProductDetails productDetails = productDetailsList.get(0);
                List<BillingFlowParams.ProductDetailsParams> detailsParamsList = new ArrayList<>();
                detailsParamsList.add(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(productDetails)
                        .build()
                );

                BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                        .setProductDetailsParamsList(detailsParamsList)
                        .build();

                // 결제 결과는 onPurchasesUpdated()에서 처리됨
                pendingPurchaseCall = call;
                BillingResult launchResult = billingClient.launchBillingFlow(getActivity(), flowParams);
                if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    pendingPurchaseCall = null;
                    call.reject("launchBillingFlow failed: " + launchResult.getDebugMessage());
                }
            });
        });
    }

    /**
     * 이전 구매 복원
     * JS: KkeulBilling.restorePurchases()
     */
    @PluginMethod
    public void restorePurchases(PluginCall call) {
        connectIfNeeded(() -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build();

            billingClient.queryPurchasesAsync(params, (billingResult, purchaseList) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("restorePurchases failed: " + billingResult.getDebugMessage());
                    return;
                }
                JSArray purchases = new JSArray();
                for (Purchase p : purchaseList) {
                    purchases.put(buildPurchaseObject(p));
                }
                JSObject ret = new JSObject();
                ret.put("purchases", purchases);
                call.resolve(ret);
            });
        });
    }

    // ──────────────────────────────────────────────
    // 결제 결과 콜백
    // ──────────────────────────────────────────────

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        if (pendingPurchaseCall == null) return;

        int code = billingResult.getResponseCode();

        if (code == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                acknowledgePurchase(purchase);
            }
            // 첫 번째 구매 결과를 JS에 반환
            JSObject ret = new JSObject();
            ret.put("purchase", buildPurchaseObject(purchases.get(0)));
            pendingPurchaseCall.resolve(ret);
        } else if (code == BillingClient.BillingResponseCode.USER_CANCELED) {
            pendingPurchaseCall.reject("USER_CANCELED");
        } else {
            pendingPurchaseCall.reject("Purchase failed: " + billingResult.getDebugMessage());
        }
        pendingPurchaseCall = null;
    }

    // ──────────────────────────────────────────────
    // 헬퍼
    // ──────────────────────────────────────────────

    /** 구매 확인 (acknowledge) — 3일 안에 처리하지 않으면 자동 환불됨 */
    private void acknowledgePurchase(Purchase purchase) {
        if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED
                && !purchase.isAcknowledged()) {
            AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchase.getPurchaseToken())
                    .build();
            billingClient.acknowledgePurchase(params, result ->
                Log.d(TAG, "Acknowledge result: " + result.getResponseCode())
            );
        }
    }

    private JSObject buildPurchaseObject(Purchase purchase) {
        JSObject obj = new JSObject();
        obj.put("orderId", purchase.getOrderId());
        obj.put("purchaseToken", purchase.getPurchaseToken());
        obj.put("purchaseState", purchase.getPurchaseState());
        obj.put("isAcknowledged", purchase.isAcknowledged());
        JSArray products = new JSArray();
        for (String p : purchase.getProducts()) products.put(p);
        obj.put("products", products);
        return obj;
    }
}
