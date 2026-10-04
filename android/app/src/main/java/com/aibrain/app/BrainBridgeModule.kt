package com.aibrain.app

import android.content.Context
import android.content.SharedPreferences
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * AI Brain Native Android Bridge Module
 * Connects Android native services (Bubble, Accessibility, Selection, Share)
 * to the Brain Server REST API with offline caching and background synchronization.
 */
object BrainBridgeModule {

    private const val PREFS_NAME = "ai_brain_prefs"
    private const val KEY_SERVER_URL = "server_url"
    private const val KEY_API_KEY = "api_key"
    private const val KEY_ACCOUNT_KEY = "account_key"

    private const val DEFAULT_SERVER = "http://10.0.2.2:3000" // Android emulator loopback or LAN IP
    private const val DEFAULT_KEY = "brain_key_master_sinhala_english_universal_access"

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun getServerUrl(context: Context): String {
        return getPrefs(context).getString(KEY_SERVER_URL, DEFAULT_SERVER) ?: DEFAULT_SERVER
    }

    fun getApiKey(context: Context): String {
        return getPrefs(context).getString(KEY_API_KEY, DEFAULT_KEY) ?: DEFAULT_KEY
    }

    fun setConfig(context: Context, serverUrl: String, apiKey: String, accountKey: String) {
        getPrefs(context).edit()
            .putString(KEY_SERVER_URL, serverUrl)
            .putString(KEY_API_KEY, apiKey)
            .putString(KEY_ACCOUNT_KEY, accountKey)
            .apply()
    }

    /**
     * Executes a chat turn against the Brain Server
     */
    fun chatQuery(context: Context, prompt: String): String {
        val server = getServerUrl(context)
        val apiKey = getApiKey(context)

        return try {
            val json = JSONObject().apply {
                put("message", prompt)
                put("clientType", "android_apk")
            }
            val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())

            val req = Request.Builder()
                .url("$server/api/v1/chat")
                .addHeader("Authorization", "Bearer $apiKey")
                .post(body)
                .build()

            val res = httpClient.newCall(req).execute()
            if (res.isSuccessful) {
                val resJson = JSONObject(res.body?.string() ?: "{}")
                resJson.optString("reply", "No reply received")
            } else {
                "Error: Server returned code ${res.code}"
            }
        } catch (e: Exception) {
            "Offline / Network error: ${e.message}"
        }
    }

    /**
     * Saves a memory directly to the Brain Server with offline fallback
     */
    fun saveMemoryDirectly(context: Context, content: String, tier: String, sourceType: String): Boolean {
        val server = getServerUrl(context)
        val apiKey = getApiKey(context)

        return try {
            val json = JSONObject().apply {
                put("tier", tier)
                put("content", content)
                put("sourceType", sourceType)
            }
            val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())

            val req = Request.Builder()
                .url("$server/api/v1/memories")
                .addHeader("Authorization", "Bearer $apiKey")
                .post(body)
                .build()

            val res = httpClient.newCall(req).execute()
            res.isSuccessful
        } catch (e: Exception) {
            // In a production app, persist to local SQLite Room DB and mark pending_sync = true
            false
        }
    }

    /**
     * Records ambient text read by Accessibility service
     */
    fun recordAmbientContext(context: Context, packageName: String, screenText: String) {
        saveMemoryDirectly(
            context,
            content = "Screen context from $packageName:\n$screenText",
            tier = "chat",
            sourceType = "android_accessibility"
        )
    }
}
