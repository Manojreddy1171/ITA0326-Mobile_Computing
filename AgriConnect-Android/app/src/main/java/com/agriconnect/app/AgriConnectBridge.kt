package com.agriconnect.app

import android.content.Context
import android.webkit.JavascriptInterface
import android.widget.Toast

/**
 * JavaScript bridge between the AgriConnect web app and Android.
 *
 * Usage inside any HTML page:
 *   AgriConnectAndroid.showToast("Hello from JS!")
 *   AgriConnectAndroid.getPlatform()   // returns "android"
 */
class AgriConnectBridge(private val context: Context) {

    @JavascriptInterface
    fun showToast(message: String) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
    }

    @JavascriptInterface
    fun getPlatform(): String = "android"

    @JavascriptInterface
    fun getAppVersion(): String = "1.0.0"
}
