package com.aibrain.app

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.os.Bundle
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * AI Brain Text Selection Context Menu Activity
 * Handles Intent.ACTION_PROCESS_TEXT across the entire Android operating system.
 * Translates or explains highlighted text in Sinhala or English.
 */
class BrainProcessTextActivity : Activity() {

    private val activityScope = CoroutineScope(Dispatchers.Main)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val selectedText = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString() ?: ""
        if (selectedText.isNotBlank()) {
            processSelectedText(selectedText)
        } else {
            finish()
        }
    }

    private fun processSelectedText(text: String) {
        val loadingDialog = AlertDialog.Builder(this)
            .setTitle("🧠 AI Brain")
            .setMessage("විශ්ලේෂණය කරමින් පවතී... (Analyzing text)")
            .setCancelable(false)
            .create()
        loadingDialog.show()

        activityScope.launch {
            val response = withContext(Dispatchers.IO) {
                BrainBridgeModule.chatQuery(applicationContext, "Translate and explain this selected text: $text")
            }

            loadingDialog.dismiss()

            AlertDialog.Builder(this@BrainProcessTextActivity)
                .setTitle("🧠 AI Brain (විසඳුම / Answer)")
                .setMessage(response)
                .setPositiveButton("Close (වසන්න)") { _, _ -> finish() }
                .setNeutralButton("Save to Memory") { _, _ ->
                    activityScope.launch {
                        withContext(Dispatchers.IO) {
                            BrainBridgeModule.saveMemoryDirectly(applicationContext, text, "facts", "android_selection")
                        }
                        finish()
                    }
                }
                .setOnDismissListener { finish() }
                .show()
        }
    }
}
