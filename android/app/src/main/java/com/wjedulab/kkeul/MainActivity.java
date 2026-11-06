package com.wjedulab.kkeul;

import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import com.getcapacitor.BridgeActivity;
import com.kakao.adfit.ads.ba.BannerAdView;
import com.kakao.adfit.ads.AdListener;

public class MainActivity extends BridgeActivity {
    private BannerAdView adView;

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(BillingPlugin.class);
        super.onCreate(savedInstanceState);

        try {
            // 카카오 애드핏 배너 320x50 추가
            adView = new BannerAdView(this);
            adView.setClientId("DAN-xDjPylBX9XVfPMUY");

            // 하단 고정 파라미터
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
            );
            params.gravity = Gravity.BOTTOM;

            // 웹뷰 컨테이너 위에 배너 추가
            ViewGroup rootView = (ViewGroup) findViewById(android.R.id.content);
            if (rootView != null) {
                rootView.addView(adView, params);
            }

            // 배너가 앱 화면(하단 메뉴)을 가리지 않도록 웹뷰를 배너 높이(50dp)만큼 위로 올린다
            android.webkit.WebView webView = getBridge().getWebView();
            if (webView != null && webView.getLayoutParams() instanceof ViewGroup.MarginLayoutParams) {
                ViewGroup.MarginLayoutParams webParams = (ViewGroup.MarginLayoutParams) webView.getLayoutParams();
                webParams.bottomMargin = (int) (50 * getResources().getDisplayMetrics().density);
                webView.setLayoutParams(webParams);
            }

            adView.loadAd();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (adView != null) adView.resume();
    }

    @Override
    public void onPause() {
        super.onPause();
        if (adView != null) adView.pause();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (adView != null) adView.destroy();
    }
}
