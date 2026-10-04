package com.aibrain.app

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * AI Brain Accessibility Service
 * Reads active view hierarchies and context inside third-party apps,
 * displays a visible privacy indicator in notifications, and assists with explicit user consent.
 */
class BrainAccessibilityService : AccessibilityService() {

    private val serviceScope = CoroutineScope(Dispatchers.IO)
    private var lastExtractedText = ""
    private var lastPackage = ""

    companion object {
        var isServiceRunning = false
        var activeForegroundApp = ""
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        isServiceRunning = true

        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                    AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                    AccessibilityEvent.TYPE_VIEW_CLICKED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 150
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
        }
        serviceInfo = info

        showPrivacyIndicatorNotification()
    }

    private fun showPrivacyIndicatorNotification() {
        val channelId = "brain_accessibility_indicator"
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "AI Brain Privacy Indicator",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Notifies when AI Brain is reading screen context with consent"
            }
            manager.createNotificationChannel(channel)
        }

        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("🟢 AI Brain System Assist Active")
            .setContentText("Reading screen context with explicit user consent")
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        manager.notify(1002, notification)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val pkgName = event.packageName?.toString() ?: ""
        if (pkgName.isNotEmpty() && pkgName != packageName) {
            activeForegroundApp = pkgName
            lastPackage = pkgName
        }

        // Extract visible text from active root node
        val rootNode = rootInActiveWindow ?: return
        val sb = StringBuilder()
        traverseNodes(rootNode, sb)
        val extracted = sb.toString().trim()

        if (extracted.isNotEmpty() && extracted != lastExtractedText) {
            lastExtractedText = extracted
            onScreenContextChanged(pkgName, extracted)
        }
    }

    private fun traverseNodes(node: AccessibilityNodeInfo?, sb: StringBuilder) {
        if (node == null) return
        val text = node.text
        if (!text.isNullOrEmpty()) {
            sb.append(text).append(" ")
        }
        for (i in 0 until node.childCount) {
            traverseNodes(node.getChild(i), sb)
        }
    }

    private fun onScreenContextChanged(packageName: String, screenText: String) {
        // Dispatches screen context to BrainBridgeModule for optional ambient memory sync
        serviceScope.launch {
            if (screenText.length > 20) {
                BrainBridgeModule.recordAmbientContext(applicationContext, packageName, screenText)
            }
        }
    }

    override fun onInterrupt() {
        isServiceRunning = false
    }

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(1002)
    }
}
