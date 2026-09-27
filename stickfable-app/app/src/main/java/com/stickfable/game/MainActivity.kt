package com.stickfable.game

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.*
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Fullscreen immersive for game
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        )
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED)

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
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
            mediaPlaybackRequiresUserGesture = false
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            // Game optimizations
            setRenderPriority(WebSettings.RenderPriority.HIGH)
            // Enable WebGL for Three.js
            setGeolocationEnabled(false)
        }

        if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            @Suppress("DEPRECATION")
            WebSettingsCompat.setForceDark(web.settings, WebSettingsCompat.FORCE_DARK_OFF)
        }
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                request.grant(request.resources)
            }
            override fun onConsoleMessage(m: ConsoleMessage): Boolean {
                android.util.Log.d("StickFable-JS", "${m.message()} @${m.lineNumber()} [${m.sourceId()}]")
                return true
            }
        }

        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val u = request.url.toString()
                // Keep game inside WebView, open external links in browser
                return if (u.startsWith("file://") || u.startsWith("https://appassets.androidplatform.net")) false
                else {
                    try { startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, request.url)) } catch (_: Exception) {}
                    true
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Inject mobile optimizations
                web.evaluateJavascript("""
                    (function(){
                        console.log('StickFable Android injected');
                        // Force landscape hint
                        document.body.style.touchAction='none';
                        // Disable pull-to-refresh
                        document.addEventListener('touchmove', function(e){ e.preventDefault(); }, {passive:false});
                        // Hide scrollbars
                        document.documentElement.style.overflow='hidden';
                        // Android bridge for haptics
                        window.Android = {
                            vibrate: function(ms){
                                try { AndroidBridge.vibrate(ms); } catch(e){ if(navigator.vibrate) navigator.vibrate(ms); }
                            }
                        };
                    })();
                """.trimIndent(), null)
            }
        }

        // JavaScript interface for native features
        web.addJavascriptInterface(AndroidBridge(), "AndroidBridge")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // In game, back should pause, not exit
                if (web.canGoBack()) {
                    web.evaluateJavascript("if(window.togglePauseClaude) togglePauseClaude();", null)
                } else {
                    moveTaskToBack(true)
                }
            }
        })

        if (savedInstanceState == null) {
            web.loadUrl("file:///android_asset/index.html")
        } else {
            web.restoreState(savedInstanceState)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        web.resumeTimers()
        // Re-apply immersive
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        )
    }

    override fun onPause() {
        super.onPause()
        web.pauseTimers()
        web.onPause()
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }

    inner class AndroidBridge {
        @JavascriptInterface
        fun vibrate(ms: Long) {
            runOnUiThread {
                try {
                    val vibrator = getSystemService(android.content.Context.VIBRATOR_SERVICE) as android.os.Vibrator
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        vibrator.vibrate(android.os.VibrationEffect.createOneShot(ms, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
                    } else {
                        @Suppress("DEPRECATION")
                        vibrator.vibrate(ms)
                    }
                } catch (_: Exception) {}
            }
        }

        @JavascriptInterface
        fun getVersion(): String {
            return BuildConfig.VERSION_NAME
        }

        @JavascriptInterface
        fun showToast(msg: String) {
            runOnUiThread {
                android.widget.Toast.makeText(this@MainActivity, msg, android.widget.Toast.LENGTH_SHORT).show()
            }
        }
    }
}
