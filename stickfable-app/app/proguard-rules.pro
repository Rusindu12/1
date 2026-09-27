# Keep WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keep public class com.stickfable.game.MainActivity$AndroidBridge { *; }
