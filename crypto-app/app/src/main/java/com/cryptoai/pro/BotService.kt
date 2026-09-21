package com.cryptoai.pro

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.app.NotificationCompat

/**
 * Foreground service that keeps the trading bot alive 24/7.
 *
 *  • App open:        holds a PARTIAL_WAKE_LOCK so the WebView JS timers keep
 *                     firing with the screen off / app in background.
 *  • App closed       (swipe from recents, back-out, system kill): starts a
 *                     HEADLESS WebView that loads index.html?bg=1 — the JS bot
 *                     boots in background mode and keeps trading (paper or
 *                     live) with no UI.
 *  • Phone reboot:    BootReceiver starts this service; if the bot was running
 *                     before the reboot it auto-resumes here (headless).
 */
class BotService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val text = intent?.getStringExtra("text") ?: "24/7 trading bot"
        createChannels(this)
        startForeground(NOTIF_ID, buildNotification(this, text))
        acquireLock()
        if (!mainAlive && autoOn(this)) ensureBgEngine(this)
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        // User swiped the app away — hand the bot over to the headless engine.
        if (autoOn(this)) {
            handler.postDelayed({
                if (!mainAlive && autoOn(this@BotService)) {
                    start(this@BotService, "24/7 bot · background engine")
                    ensureBgEngine(this@BotService)
                }
            }, 600)
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
        super.onDestroy()
    }

    private fun acquireLock() {
        if (wakeLock != null) return
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        @Suppress("WakelockTimeout")
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "cryptoai:bot24x7").also { it.acquire() }
    }

    companion object {
        const val CH_SERVICE = "bot_service"
        const val CH_SIGNAL = "signals"
        const val NOTIF_ID = 1001

        @Volatile private var mainAlive = false
        private var bgWeb: WebView? = null
        private val handler = Handler(Looper.getMainLooper())

        private fun prefs(ctx: Context) = ctx.getSharedPreferences("bridge", Context.MODE_PRIVATE)
        private fun autoOn(ctx: Context): Boolean = prefs(ctx).getBoolean("auto", false)

        fun createChannels(ctx: Context) {
            if (Build.VERSION.SDK_INT < 26) return
            val nm = ctx.getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(NotificationChannel(CH_SERVICE, "Bot service", NotificationManager.IMPORTANCE_LOW))
            nm.createNotificationChannel(NotificationChannel(CH_SIGNAL, "Trade signals", NotificationManager.IMPORTANCE_HIGH))
        }

        fun buildNotification(ctx: Context, text: String): Notification {
            val pi = PendingIntent.getActivity(ctx, 0, Intent(ctx, MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            return NotificationCompat.Builder(ctx, CH_SERVICE)
                .setSmallIcon(R.drawable.ic_notif)
                .setContentTitle("CryptoAI PRO · 24/7")
                .setContentText(text)
                .setOngoing(true).setOnlyAlertOnce(true)
                .setContentIntent(pi).build()
        }

        fun start(ctx: Context, text: String) {
            val i = Intent(ctx, BotService::class.java).putExtra("text", text)
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i) else ctx.startService(i)
        }
        fun stop(ctx: Context) = ctx.stopService(Intent(ctx, BotService::class.java))

        fun update(ctx: Context, text: String) {
            val nm = ctx.getSystemService(NotificationManager::class.java)
            nm.notify(NOTIF_ID, buildNotification(ctx, text))
        }

        /** MainActivity.onCreate — the visible app owns the bot again. */
        fun attachMain() {
            mainAlive = true
            destroyBgEngine()
        }

        /** MainActivity.onDestroy — hand the bot over to the headless engine. */
        fun detachMain(ctx: Context) {
            mainAlive = false
            if (!autoOn(ctx)) return
            handler.postDelayed({
                if (!mainAlive && autoOn(ctx)) {
                    start(ctx, "24/7 bot · background engine")
                    ensureBgEngine(ctx)
                }
            }, 800)
        }

        /**
         * Headless engine: an off-screen WebView running the same app with
         * ?bg=1. The JS boots in background mode (no UI painting) and
         * auto-resumes the bot from the shared localStorage state.
         */
        private fun ensureBgEngine(ctx: Context) {
            if (bgWeb != null || mainAlive) return
            handler.post {
                if (bgWeb != null || mainAlive) return@post
                try {
                    val web = WebView(ctx)
                    web.settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        cacheMode = WebSettings.LOAD_DEFAULT
                        blockNetworkImage = true
                        loadsImagesAutomatically = false
                    }
                    web.webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = true
                    }
                    // full bridge in context-only mode (no UI actions) — the bg bot
                    // can auto-resume, notify, update the status bar and trade live
                    web.addJavascriptInterface(AndroidBridge(ctx.applicationContext, null), "AndroidBridge")
                    bgWeb = web
                    web.loadUrl("file:///android_asset/index.html?bg=1")
                } catch (_: Exception) {
                    bgWeb = null
                }
            }
        }

        private fun destroyBgEngine() {
            handler.post {
                bgWeb?.let { try { it.loadUrl("about:blank"); it.destroy() } catch (_: Exception) {} }
                bgWeb = null
            }
        }
    }
}
