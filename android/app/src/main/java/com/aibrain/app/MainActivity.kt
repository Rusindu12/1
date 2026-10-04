package com.aibrain.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * AI Brain Android Main Activity
 * Controls Universal Access permissions, floating bubble service,
 * accessibility toggle, and full-featured bilingual chat client.
 */
class MainActivity : AppCompatActivity() {

    private val activityScope = CoroutineScope(Dispatchers.Main)
    private lateinit var chatContainer: LinearLayout
    private lateinit var scrollView: ScrollView
    private lateinit var inputField: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Build clean native Android UI layout programmatically
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(android.graphics.Color.parseColor("#0B0F19"))
            setPadding(32, 48, 32, 32)
        }

        // Header
        val titleView = TextView(this).apply {
            text = "🧠 AI Brain (සිංහල + English)"
            textSize = 20f
            setTextColor(android.graphics.Color.parseColor("#38BDF8"))
            setTypeface(null, android.graphics.Typeface.BOLD)
        }
        root.addView(titleView)

        val descView = TextView(this).apply {
            text = "Universal Access: Floating Bubble · Selection · Accessibility · Shared Cloud Memory"
            textSize = 12f
            setTextColor(android.graphics.Color.parseColor("#94A3B8"))
            setPadding(0, 8, 0, 24)
        }
        root.addView(descView)

        // Permission Buttons Row
        val btnRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 0, 0, 16)
        }

        val bubbleBtn = Button(this).apply {
            text = "Enable Bubble 🫧"
            setOnClickListener { checkOverlayPermissionAndStart() }
        }
        btnRow.addView(bubbleBtn)

        val accessBtn = Button(this).apply {
            text = "Accessibility ⚙️"
            setOnClickListener {
                startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
            }
        }
        btnRow.addView(accessBtn)
        root.addView(btnRow)

        // Chat History ScrollView
        scrollView = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
            setBackgroundColor(android.graphics.Color.parseColor("#121826"))
        }

        chatContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 16, 16, 16)
        }
        scrollView.addView(chatContainer)
        root.addView(scrollView)

        // Initial Greeting
        appendMessage("AI Brain", "ආයුබෝවන්! මම ඔබගේ AI Brain සහායකයා. ඕනෑම app එකක සිට Floating Bubble හෝ Text Selection මගින් මාව භාවිතා කළ හැක.")

        // Input Row
        val inputRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 16, 0, 0)
        }

        inputField = EditText(this).apply {
            hint = "Type in Sinhala, Singlish, or English..."
            setTextColor(android.graphics.Color.WHITE)
            setHintTextColor(android.graphics.Color.parseColor("#64748B"))
            setBackgroundColor(android.graphics.Color.parseColor("#1E293B"))
            setPadding(20, 20, 20, 20)
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        inputRow.addView(inputField)

        val sendBtn = Button(this).apply {
            text = "යවන්න ➔"
            setBackgroundColor(android.graphics.Color.parseColor("#38BDF8"))
            setTextColor(android.graphics.Color.parseColor("#0B0F19"))
            setOnClickListener { onSendClicked() }
        }
        inputRow.addView(sendBtn)
        root.addView(inputRow)

        setContentView(root)
    }

    private fun checkOverlayPermissionAndStart() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Toast.makeText(this, "Please grant 'Draw over other apps' permission", Toast.LENGTH_LONG).show()
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                startActivity(intent)
                return
            }
        }
        val serviceIntent = Intent(this, BrainBubbleService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
        Toast.makeText(this, "AI Brain Floating Bubble Started!", Toast.LENGTH_SHORT).show()
    }

    private fun onSendClicked() {
        val query = inputField.text.toString().trim()
        if (query.isBlank()) return

        appendMessage("You", query)
        inputField.text.clear()

        activityScope.launch {
            val reply = withContext(Dispatchers.IO) {
                BrainBridgeModule.chatQuery(applicationContext, query)
            }
            appendMessage("AI Brain", reply)
        }
    }

    private fun appendMessage(sender: String, message: String) {
        val msgView = TextView(this).apply {
            text = "$sender:\n$message\n"
            textSize = 14f
            setTextColor(if (sender == "You") android.graphics.Color.parseColor("#38BDF8") else android.graphics.Color.WHITE)
            setPadding(8, 8, 8, 8)
        }
        chatContainer.addView(msgView)
        scrollView.post { scrollView.fullScroll(ScrollView.FOCUS_DOWN) }
    }
}
