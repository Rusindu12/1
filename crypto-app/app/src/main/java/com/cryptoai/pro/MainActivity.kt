package com.cryptoai.pro

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.*
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature

class MainActivity : AppCompatActivity() {
    companion object {
        // The hosted AI Brain is the app's home screen. Keeping this in one place
        // also makes it easy to point a future release at a different deployment.
        private const val HOME_URL = "https://p1men83qhkg1-d.space-z.ai/"
        private const val HOME_HOST = "p1men83qhkg1-d.space-z.ai"
    }

    lateinit var web: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        setContentView(web)
        web.setBackgroundColor(ContextCompat.getColor(this, R.color.bg_dark))
        web.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = false
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            setSupportZoom(false)
            userAgentString = "$userAgentString CryptoAIPRO/${BuildConfig.VERSION_NAME}"
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            @Suppress("DEPRECATION")
            WebSettingsCompat.setForceDark(web.settings, WebSettingsCompat.FORCE_DARK_OFF)
        }
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        bridge = AndroidBridge(this)
        web.addJavascriptInterface(bridge, "AndroidBridge")
        BotService.attachMain()   // 24/7: the visible app owns the bot; stop any headless engine

        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) { request.grant(request.resources) }
            override fun onConsoleMessage(m: ConsoleMessage): Boolean {
                android.util.Log.d("CryptoAI-JS", "${m.message()} @${m.lineNumber()}")
                return true
            }
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                val isAppPage = uri.scheme == "https" && uri.host == HOME_HOST
                // Keep the hosted AI Brain (including its internal routes) in the app;
                // hand unrelated links to the user's browser.
                return if (isAppPage || uri.scheme == "file" || uri.host == "appassets.androidplatform.net") false
                else { try { startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, uri)) } catch (_: Exception) {}; true }
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (web.canGoBack()) web.goBack() else moveTaskToBack(true)
            }
        })

        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        }

        if (savedInstanceState == null) web.loadUrl("file:///android_asset/index.html")
        else web.restoreState(savedInstanceState)
    }

    override fun onSaveInstanceState(outState: Bundle) { super.onSaveInstanceState(outState); web.saveState(outState) }
    override fun onResume() { super.onResume(); web.onResume(); web.resumeTimers() }
    // Do NOT pause timers on pause: the bot keeps running in the background with the foreground service.
    override fun onDestroy() {
        // 24/7: if the bot was running, the headless background engine takes over here.
        BotService.detachMain(this)
        bridge.destroy(); web.destroy(); super.onDestroy()
    }
}
