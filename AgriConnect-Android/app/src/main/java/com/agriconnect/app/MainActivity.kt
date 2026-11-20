package com.agriconnect.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.webkit.*
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.agriconnect.app.databinding.ActivityMainBinding
import com.google.android.material.textfield.TextInputEditText
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    // ----------------------------------------------------------------
    // Server URL preference key
    // ----------------------------------------------------------------
    companion object {
        private const val PREFS_NAME = "AgriConnectPrefs"
        private const val KEY_SERVER_URL = "server_url"
        // Default: 10.0.2.2 is the Android Emulator's alias for the host PC
        private const val DEFAULT_EMULATOR_URL = "http://10.0.2.2:5000"
        private const val TAG = "AgriConnect"
        private const val REQUEST_PERMISSION_CODE = 101
    }

    private var currentServerUrl: String = DEFAULT_EMULATOR_URL
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var cameraImageUri: Uri? = null

    // ----------------------------------------------------------------
    // Activity result launchers
    // ----------------------------------------------------------------
    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val uris = WebChromeClient.FileChooserParams.parseResult(
                result.resultCode,
                result.data
            )
            fileUploadCallback?.onReceiveValue(uris)
        } else {
            fileUploadCallback?.onReceiveValue(null)
        }
        fileUploadCallback = null
    }

    private val cameraLauncher = registerForActivityResult(
        ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && cameraImageUri != null) {
            fileUploadCallback?.onReceiveValue(arrayOf(cameraImageUri!!))
        } else {
            fileUploadCallback?.onReceiveValue(null)
        }
        fileUploadCallback = null
        cameraImageUri = null
    }

    // ----------------------------------------------------------------
    // onCreate
    // ----------------------------------------------------------------
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Load saved server URL
        currentServerUrl = getServerUrl()

        // Setup WebView
        setupWebView()

        // Button listeners on error screen
        binding.retryButton.setOnClickListener { loadAgriConnect() }
        binding.settingsButton.setOnClickListener { showServerSettingsDialog() }

        // Load the app
        loadAgriConnect()
    }

    // ----------------------------------------------------------------
    // Options menu
    // ----------------------------------------------------------------
    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_server -> {
                showServerSettingsDialog()
                true
            }
            R.id.action_refresh -> {
                binding.webView.reload()
                true
            }
            R.id.action_home -> {
                binding.webView.loadUrl(currentServerUrl)
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    // ----------------------------------------------------------------
    // WebView setup
    // ----------------------------------------------------------------
    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val webSettings = binding.webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true          // Required for localStorage (JWT tokens)
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            loadWithOverviewMode = true
            useWideViewPort = true
            setSupportZoom(true)
            builtInZoomControls = false
            displayZoomControls = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            // Allow cookies
            CookieManager.getInstance().setAcceptThirdPartyCookies(binding.webView, true)
        }

        // JavaScript interface so the web app can communicate with Android
        binding.webView.addJavascriptInterface(AgriConnectBridge(this), "AgriConnectAndroid")

        binding.webView.webViewClient = object : WebViewClient() {

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                binding.loadingBar.visibility = View.VISIBLE
                binding.errorLayout.visibility = View.GONE
                binding.webView.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                binding.loadingBar.visibility = View.GONE
                CookieManager.getInstance().flush()
            }

            @Deprecated("Deprecated in Java")
            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                super.onReceivedError(view, errorCode, description, failingUrl)
                handleLoadError(failingUrl ?: currentServerUrl, description ?: "Unknown error")
            }

            override fun onReceivedSslError(
                view: WebView?,
                handler: SslErrorHandler?,
                error: SslError?
            ) {
                // For local dev only - in production always call handler.cancel()
                handler?.proceed()
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                // Open external links (non-backend URLs) in browser
                return if (url.startsWith(currentServerUrl) || url.startsWith("http://10.0.2.2")) {
                    false // Let WebView handle it
                } else if (url.startsWith("http://") || url.startsWith("https://")) {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    true
                } else {
                    false
                }
            }
        }

        // Chrome client for file uploads, console logs, and JS alerts
        binding.webView.webChromeClient = object : WebChromeClient() {

            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                super.onProgressChanged(view, newProgress)
                if (newProgress == 100) {
                    binding.loadingBar.visibility = View.GONE
                } else {
                    binding.loadingBar.visibility = View.VISIBLE
                }
            }

            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                Log.d(TAG, "JS: ${consoleMessage?.message()} [${consoleMessage?.sourceId()}:${consoleMessage?.lineNumber()}]")
                return true
            }

            override fun onJsAlert(
                view: WebView?,
                url: String?,
                message: String?,
                result: JsResult?
            ): Boolean {
                AlertDialog.Builder(this@MainActivity)
                    .setTitle("AgriConnect")
                    .setMessage(message)
                    .setPositiveButton("OK") { _, _ -> result?.confirm() }
                    .setOnCancelListener { result?.cancel() }
                    .show()
                return true
            }

            override fun onJsConfirm(
                view: WebView?,
                url: String?,
                message: String?,
                result: JsResult?
            ): Boolean {
                AlertDialog.Builder(this@MainActivity)
                    .setTitle("AgriConnect")
                    .setMessage(message)
                    .setPositiveButton("OK") { _, _ -> result?.confirm() }
                    .setNegativeButton("Cancel") { _, _ -> result?.cancel() }
                    .setOnCancelListener { result?.cancel() }
                    .show()
                return true
            }

            // ---- File chooser for image/document uploads ----
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                requestStoragePermissionIfNeeded {
                    showFileChooserDialog(fileChooserParams)
                }
                return true
            }
        }
    }

    // ----------------------------------------------------------------
    // File chooser: gallery + camera option
    // ----------------------------------------------------------------
    private fun showFileChooserDialog(params: WebChromeClient.FileChooserParams?) {
        val options = arrayOf("Choose from Gallery", "Take Photo with Camera", "Cancel")
        AlertDialog.Builder(this)
            .setTitle("Upload File")
            .setItems(options) { dialog, which ->
                when (which) {
                    0 -> {
                        // Gallery picker
                        val intent = params?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                            type = "image/*"
                            addCategory(Intent.CATEGORY_OPENABLE)
                        }
                        filePickerLauncher.launch(intent)
                    }
                    1 -> {
                        // Camera
                        try {
                            val photoFile = createImageFile()
                            val uri = FileProvider.getUriForFile(
                                this,
                                "${packageName}.fileprovider",
                                photoFile
                            )
                            cameraImageUri = uri
                            cameraLauncher.launch(uri)
                        } catch (ex: IOException) {
                            Log.e(TAG, "Camera error: ${ex.message}")
                            fileUploadCallback?.onReceiveValue(null)
                            fileUploadCallback = null
                        }
                    }
                    2 -> {
                        fileUploadCallback?.onReceiveValue(null)
                        fileUploadCallback = null
                        dialog.dismiss()
                    }
                }
            }
            .setOnCancelListener {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = null
            }
            .show()
    }

    @Throws(IOException::class)
    private fun createImageFile(): File {
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile("AGRI_${timestamp}_", ".jpg", storageDir)
    }

    // ----------------------------------------------------------------
    // Load URL helper
    // ----------------------------------------------------------------
    private fun loadAgriConnect() {
        binding.errorLayout.visibility = View.GONE
        binding.webView.visibility = View.VISIBLE
        binding.loadingBar.visibility = View.VISIBLE
        binding.webView.loadUrl(currentServerUrl)
    }

    // ----------------------------------------------------------------
    // Error screen
    // ----------------------------------------------------------------
    private fun handleLoadError(url: String, description: String) {
        binding.loadingBar.visibility = View.GONE
        binding.webView.visibility = View.GONE
        binding.errorLayout.visibility = View.VISIBLE
        binding.errorUrlText.text = "Tried: $url"
        Log.e(TAG, "Load failed: $description @ $url")
    }

    // ----------------------------------------------------------------
    // Server settings dialog
    // ----------------------------------------------------------------
    private fun showServerSettingsDialog() {
        val dialogView = layoutInflater.inflate(R.layout.dialog_server_settings, null)
        val input = dialogView.findViewById<TextInputEditText>(R.id.serverUrlInput)
        input.setText(currentServerUrl)

        AlertDialog.Builder(this)
            .setTitle("Server Settings")
            .setView(dialogView)
            .setPositiveButton("Save") { _, _ ->
                val newUrl = input.text.toString().trim().trimEnd('/')
                if (newUrl.isNotEmpty()) {
                    currentServerUrl = newUrl
                    saveServerUrl(newUrl)
                    Toast.makeText(this, "Server URL saved. Reloading…", Toast.LENGTH_SHORT).show()
                    loadAgriConnect()
                }
            }
            .setNegativeButton("Cancel", null)
            .setNeutralButton("Reset to Default") { _, _ ->
                currentServerUrl = DEFAULT_EMULATOR_URL
                saveServerUrl(DEFAULT_EMULATOR_URL)
                Toast.makeText(this, "Reset to emulator default.", Toast.LENGTH_SHORT).show()
                loadAgriConnect()
            }
            .show()
    }

    // ----------------------------------------------------------------
    // Preferences helpers
    // ----------------------------------------------------------------
    private fun getServerUrl(): String {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_SERVER_URL, DEFAULT_EMULATOR_URL) ?: DEFAULT_EMULATOR_URL
    }

    private fun saveServerUrl(url: String) {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putString(KEY_SERVER_URL, url).apply()
    }

    // ----------------------------------------------------------------
    // Storage permission helper
    // ----------------------------------------------------------------
    private fun requestStoragePermissionIfNeeded(onGranted: () -> Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES)
                == PackageManager.PERMISSION_GRANTED
            ) {
                onGranted()
            } else {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.READ_MEDIA_IMAGES),
                    REQUEST_PERMISSION_CODE
                )
                // Call after permission - simplified for demo
                onGranted()
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE)
                == PackageManager.PERMISSION_GRANTED
            ) {
                onGranted()
            } else {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE),
                    REQUEST_PERMISSION_CODE
                )
                onGranted()
            }
        }
    }

    // ----------------------------------------------------------------
    // Back navigation: go back in WebView instead of closing app
    // ----------------------------------------------------------------
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (binding.webView.canGoBack()) {
            binding.webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
