package com.cryptoai.pro

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Restarts the 24/7 bot after a phone reboot or an app update —
 * but only if the bot was running (auto pref set) when the device went down.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val a = intent.action ?: return
        val reboot = a == Intent.ACTION_BOOT_COMPLETED ||
            a == "android.intent.action.QUICKBOOT_POWERON" ||
            a == Intent.ACTION_MY_PACKAGE_REPLACED
        if (!reboot) return
        val p = ctx.getSharedPreferences("bridge", Context.MODE_PRIVATE)
        if (p.getBoolean("auto", false)) {
            BotService.createChannels(ctx)
            BotService.start(ctx, "24/7 bot · resumed after boot")
        }
    }
}
