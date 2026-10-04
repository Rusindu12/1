package com.aibrain.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * AI Brain Android Share-Sheet Target Activity
 * Handles Intent.ACTION_SEND from browsers, messaging apps, and documents,
 * instantly ingesting links and snippets into the Shared Brain Memory.
 */
class BrainShareTargetActivity : Activity() {

    private val activityScope = CoroutineScope(Dispatchers.Main)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (intent?.action == Intent.ACTION_SEND && intent.type == "text/plain") {
            val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT) ?: ""
            if (sharedText.isNotBlank()) {
                handleSharedContent(sharedText)
            } else {
                finish()
            }
        } else {
            finish()
        }
    }

    private fun handleSharedContent(text: String) {
        Toast.makeText(this, "🧠 Saving to AI Brain Memory...", Toast.LENGTH_SHORT).show()

        activityScope.launch {
            val success = withContext(Dispatchers.IO) {
                BrainBridgeModule.saveMemoryDirectly(
                    applicationContext,
                    content = text,
                    tier = "knowledge",
                    sourceType = "android_share"
                )
            }

            if (success) {
                Toast.makeText(applicationContext, "✓ Saved to Cloud Memory (සිංහල / English)", Toast.LENGTH_LONG).show()
            } else {
                Toast.makeText(applicationContext, "Cached locally offline for sync", Toast.LENGTH_SHORT).show()
            }
            finish()
        }
    }
}
