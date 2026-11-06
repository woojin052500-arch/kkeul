package com.wjedulab.kkeul;

import com.getcapacitor.BridgeActivity;

// 앱에는 광고를 넣지 않는다. 광고는 웹사이트(kkeul.telosix.co.kr)에서만 보여 준다.
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(BillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
