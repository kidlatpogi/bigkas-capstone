package org.nationalu.bigkas;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebStorage;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final long WEBVIEW_CACHE_RESET_MARKER = 2026051901L;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        resetStaleWebViewStorageOnce();
        super.onCreate(savedInstanceState);
    }

    private void resetStaleWebViewStorageOnce() {
        SharedPreferences prefs = getSharedPreferences("bigkas_native_boot", MODE_PRIVATE);
        if (prefs.getLong("webview_cache_reset_marker", 0L) == WEBVIEW_CACHE_RESET_MARKER) {
            return;
        }

        try {
            WebStorage.getInstance().deleteAllData();
        } catch (Exception ignored) {
        }

        try {
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.removeAllCookies(null);
            cookieManager.flush();
        } catch (Exception ignored) {
        }

        try {
            WebView cacheWebView = new WebView(this);
            cacheWebView.clearCache(true);
            cacheWebView.clearHistory();
            cacheWebView.destroy();
        } catch (Exception ignored) {
        }

        prefs.edit().putLong("webview_cache_reset_marker", WEBVIEW_CACHE_RESET_MARKER).apply();
    }
}
