# Add project specific ProGuard rules here.
-keep class com.agriconnect.app.** { *; }
-keepclassmembers class com.agriconnect.app.AgriConnectBridge {
    @android.webkit.JavascriptInterface <methods>;
}
