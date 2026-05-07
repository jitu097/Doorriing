package com.doorriing.user

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Build
import android.os.Bundle
import android.os.Message
import android.util.Log
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.doorriing.user.databinding.ActivityMainBinding
import com.doorriing.user.network.FcmTokenRequest
import com.doorriing.user.network.RetrofitClient
import com.doorriing.user.repository.AuthRepository
import com.doorriing.user.utils.NetworkUtils
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.auth.api.signin.GoogleSignInStatusCodes
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.common.api.ApiException
import com.google.android.material.snackbar.Snackbar
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "MainActivity"
    }

    private lateinit var binding: ActivityMainBinding
    private val BASE_URL = "https://doorriing.com"
    // Default in-app entry point: go directly to /home instead of the landing page.
    // The landing page is a marketing page for new web visitors — inside the app
    // we always want to start at the home screen and let Firebase restore the session.
    private val HOME_URL = "$BASE_URL/home"

    private lateinit var auth: FirebaseAuth
    private lateinit var googleSignInClient: GoogleSignInClient
    private var isGoogleSigningIn = false
    private var lastProcessedIntentId: String? = null

    private val authRepository: AuthRepository by lazy {
        AuthRepository(RetrofitClient.instance)
    }

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            Log.d("MainActivity", "Notification permission granted")
        } else {
            Log.w("MainActivity", "Notification permission denied")
        }
    }

    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        isGoogleSigningIn = false
        if (result.resultCode != RESULT_OK) {
            sendNativeGoogleErrorToWeb("Google sign-in cancelled")
            return@registerForActivityResult
        }

        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)
            val idToken = account.idToken
            if (idToken.isNullOrBlank()) {
                sendNativeGoogleErrorToWeb("Google ID token missing")
                return@registerForActivityResult
            }

            Log.d(TAG, "Google ID token received: $idToken")

            val credential = GoogleAuthProvider.getCredential(idToken, null)
            auth.signInWithCredential(credential)
                .addOnSuccessListener { authResult ->
                    val firebaseUser = authResult.user
                    if (firebaseUser == null) {
                        sendNativeGoogleErrorToWeb("Firebase user not available")
                        return@addOnSuccessListener
                    }

                    firebaseUser.getIdToken(true)
                        .addOnSuccessListener { tokenResult ->
                            val firebaseIdToken = tokenResult.token
                            if (firebaseIdToken.isNullOrBlank()) {
                                sendNativeGoogleErrorToWeb("Firebase ID token missing")
                                return@addOnSuccessListener
                            }

                            Log.d(TAG, "Firebase ID token received: $firebaseIdToken")
                            sendNativeGoogleSuccessToWeb(idToken)
                        }
                        .addOnFailureListener { error ->
                            sendNativeGoogleErrorToWeb(error.message ?: "Failed to fetch Firebase ID token")
                        }
                }
                .addOnFailureListener { error ->
                    sendNativeGoogleErrorToWeb(error.message ?: "Firebase credential sign-in failed")
                }
        } catch (error: ApiException) {
            sendNativeGoogleErrorToWeb(mapGoogleSignInError(error.statusCode))
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        auth = FirebaseAuth.getInstance()
        googleSignInClient = buildGoogleSignInClient()

        askNotificationPermission()
        setupWebView()
        setupOnBackPressed()
        fetchFcmToken()

        handleIntent(intent)
    }

    private fun buildGoogleSignInClient(): GoogleSignInClient {
        val options = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(getString(R.string.default_web_client_id))
            .requestEmail()
            .build()
        return GoogleSignIn.getClient(this, options)
    }

    private fun startNativeGoogleSignIn() {
        if (isGoogleSigningIn) return
        
        if (!ensurePlayServicesAvailable()) {
            return
        }

        isGoogleSigningIn = true
        googleSignInClient.signOut().addOnCompleteListener {
            googleSignInLauncher.launch(googleSignInClient.signInIntent)
        }
    }

    private fun sendNativeGoogleSuccessToWeb(idToken: String) {
        val escapedToken = JSONObject.quote(idToken)
        val script = "window.onNativeGoogleLoginSuccess && window.onNativeGoogleLoginSuccess($escapedToken);"
        binding.webView.post {
            binding.webView.evaluateJavascript(script, null)
        }
    }

    private fun sendNativeGoogleErrorToWeb(message: String) {
        Log.w(TAG, "Google sign-in error: $message")
        val escapedMessage = JSONObject.quote(message)
        val script = "window.onNativeGoogleLoginError && window.onNativeGoogleLoginError($escapedMessage);"
        binding.webView.post {
            binding.webView.evaluateJavascript(script, null)
        }
    }

    private fun ensurePlayServicesAvailable(): Boolean {
        val availability = GoogleApiAvailability.getInstance()
        val status = availability.isGooglePlayServicesAvailable(this)

        if (status == ConnectionResult.SUCCESS) {
            return true
        }

        val errorMessage = availability.getErrorString(status) ?: "Google Play Services are unavailable"
        sendNativeGoogleErrorToWeb(errorMessage)

        if (availability.isUserResolvableError(status)) {
            availability.getErrorDialog(this, status, 1001)?.show()
        }

        return false
    }

    private fun mapGoogleSignInError(statusCode: Int): String {
        return when (statusCode) {
            GoogleSignInStatusCodes.SIGN_IN_CANCELLED -> "Google sign-in cancelled"
            GoogleSignInStatusCodes.SIGN_IN_CURRENTLY_IN_PROGRESS -> "Google sign-in is already in progress"
            GoogleSignInStatusCodes.SIGN_IN_FAILED -> "Google sign-in failed"
            else -> "Google sign-in failed with status code: $statusCode"
        }
    }

    internal inner class AndroidAuthBridge {
        @JavascriptInterface
        fun startGoogleSignIn() {
            runOnUiThread {
                startNativeGoogleSignIn()
            }
        }

        @JavascriptInterface
        fun saveAuthToken(token: String?) {
            if (token.isNullOrBlank()) {
                DoorriingApp.prefs.clearToken()
                return
            }

            DoorriingApp.prefs.saveToken(token)
            fetchFcmToken()
        }
    }

    private fun askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            when {
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
                    PackageManager.PERMISSION_GRANTED -> {
                    Log.d("MainActivity", "Notification permission already granted")
                }
                else -> {
                    Log.d("MainActivity", "Requesting notification permission")
                    requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
            }
        }
    }

    private fun fetchFcmToken() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.w("MainActivity", "Fetching FCM registration token failed", task.exception)
                return@addOnCompleteListener
            }
            val token = task.result
            Log.d("MainActivity", "FCM Token: $token")
            syncFcmTokenToBackend(token)
        }
    }

    private fun syncFcmTokenToBackend(fcmToken: String, retryCount: Int = 0) {
        val currentUser = FirebaseAuth.getInstance().currentUser
        val bridgeToken = DoorriingApp.prefs.getToken()

        if (currentUser == null && bridgeToken.isNullOrBlank()) {
            Log.w("MainActivity", "Skipping FCM token sync: no native user or bridge token found")
            return
        }

        if (currentUser != null) {
            currentUser.getIdToken(true).addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val freshAuthToken = task.result?.token
                    if (!freshAuthToken.isNullOrBlank()) {
                        performFcmSync(freshAuthToken, fcmToken, retryCount)
                    }
                } else {
                    Log.e("MainActivity", "Failed to get fresh ID token", task.exception)
                }
            }
        } else if (!bridgeToken.isNullOrBlank()) {
            Log.d("MainActivity", "Syncing FCM token using bridge token")
            performFcmSync(bridgeToken, fcmToken, retryCount)
        }
    }

    private fun performFcmSync(authToken: String, fcmToken: String, retryCount: Int) {
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val response = authRepository.saveFcmToken(
                    authToken,
                    FcmTokenRequest(fcmToken = fcmToken, deviceType = "android")
                )

                if (response.isSuccessful) {
                    Log.d("MainActivity", "FCM token synced with backend")
                } else if (response.code() == 401 && retryCount < 1) {
                    Log.w("MainActivity", "FCM sync got 401, retrying once...")
                    syncFcmTokenToBackend(fcmToken, retryCount + 1)
                } else {
                    Log.e("MainActivity", "Failed to sync FCM token: ${response.errorBody()?.string()}")
                }
            } catch (error: Exception) {
                Log.e("MainActivity", "Error syncing FCM token", error)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent) // Always update the activity intent
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        intent?.let {
            val type = it.getStringExtra("type")
            val referenceId = it.getStringExtra("reference_id")
            val targetUrl = it.getStringExtra("target_url")

            // Create a unique ID for this intent to prevent re-processing on rotation
            val currentIntentId = "${type}_${referenceId}_${targetUrl}"
            if (currentIntentId != "__" && currentIntentId == lastProcessedIntentId) {
                Log.d("MainActivity", "Intent already processed: $currentIntentId")
                return
            }
            lastProcessedIntentId = currentIntentId

            Log.d("MainActivity", "Handling intent: type=$type, id=$referenceId, url=$targetUrl")

            // Prioritize specific notification types
            if (type != null) {
                navigateFromNotification(type, referenceId)
            } else if (!targetUrl.isNullOrEmpty()) {
                binding.webView.loadUrl(targetUrl)
            } else if (binding.webView.url == null) {
                if (NetworkUtils.isNetworkAvailable(this)) {
                    // Load /home instead of the landing page so that Firebase's
                    // persisted session is restored and the user lands on the
                    // main screen — not the marketing landing page with Signin buttons.
                    binding.webView.loadUrl(HOME_URL)
                } else {
                    showNoInternetError()
                }
            }
        }
    }

    private fun navigateFromNotification(type: String, referenceId: String?) {
        val urlToLoad = when (type) {
            "order_placed",
            "order_accepted",
            "order_confirmed",
            "order_shipped",
            "order_delivered" -> {
                if (referenceId != null) {
                    "$BASE_URL/orders/$referenceId"
                } else {
                    "$BASE_URL/orders"
                }
            }
            "offer" -> "$BASE_URL/offers"
            else -> HOME_URL
        }

        Log.d("MainActivity", "Navigating to: $urlToLoad")
        binding.webView.loadUrl(urlToLoad)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        binding.webView.apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                loadWithOverviewMode = true
                useWideViewPort = true
                cacheMode = WebSettings.LOAD_DEFAULT

                // ── Popup / multiple-window support ─────────────────────────
                // Required for Razorpay Standard Checkout to work inside a
                // WebView. Razorpay uses window.open() internally for:
                //   1. UPI Intent flow (opening the app chooser)
                //   2. Bank 3DS / OTP authentication pages
                //   3. Internal payment-state callbacks
                // Without these two settings those calls are silently dropped
                // and UPI / 3DS never completes.
                setSupportMultipleWindows(true)
                javaScriptCanOpenWindowsAutomatically = true
                // ────────────────────────────────────────────────────────────
            }

            addJavascriptInterface(AndroidAuthBridge(), "AndroidAuth")

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val url = request?.url.toString()
                    
                    if (url.startsWith("upi:")) {
                        Log.d(TAG, "[UPI] Intercepted UPI URL: $url")
                        launchUpiIntent(request?.url.toString())
                        return true
                    }

                    if (url.contains("accounts.google.com")) {
                        val intent = Intent(Intent.ACTION_VIEW, request?.url)
                        startActivity(intent)
                        return true
                    }
                    return false
                }

                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                    binding.progressBar.visibility = View.VISIBLE
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    binding.progressBar.visibility = View.GONE
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    if (request?.isForMainFrame == true) {
                        showNoInternetError()
                    }
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    if (newProgress < 100) {
                        binding.progressBar.progress = newProgress
                    }
                }

                // ── Handle Razorpay popup / new-window requests ───────────────
                // Razorpay Standard Checkout calls window.open() when it needs
                // to open a new context for UPI Intent or bank 3DS pages.
                // Without this override Android silently drops the call, which
                // prevents the UPI tab from working and breaks 3DS card payments.
                //
                // We create a transient child WebView, wire it to the Message
                // transport that Razorpay provided, and let the SDK drive it.
                // The child WebView is not added to any visible layout — Razorpay
                // manages its own overlay UI; we only need to satisfy the contract.
                override fun onCreateWindow(
                    view: WebView?,
                    isDialog: Boolean,
                    isUserGesture: Boolean,
                    resultMsg: Message?
                ): Boolean {
                    Log.d(TAG, "[WebView] onCreateWindow triggered — isDialog=$isDialog isUserGesture=$isUserGesture")

                    val transport = resultMsg?.obj as? WebView.WebViewTransport
                    if (transport == null) {
                        Log.w(TAG, "[WebView] onCreateWindow: resultMsg transport is null — ignoring")
                        return false
                    }

                    val childWebView = WebView(view!!.context).apply {
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled  = true
                        // Child WebView needs its own WebViewClient so that UPI
                        // deep links triggered inside the popup are intercepted
                        // the same way as the parent WebView.
                        webViewClient = object : WebViewClient() {
                            override fun shouldOverrideUrlLoading(
                                childView: WebView?,
                                request: WebResourceRequest?
                            ): Boolean {
                                val url = request?.url.toString()
                                if (url.startsWith("upi:")) {
                                    Log.d(TAG, "[WebView] Child popup intercepted UPI URL: $url")
                                    launchUpiIntent(url)
                                    return true
                                }
                                return false
                            }
                        }
                    }

                    transport.webView = childWebView
                    resultMsg.sendToTarget()

                    Log.d(TAG, "[WebView] onCreateWindow: child WebView created and wired to Razorpay transport")
                    return true
                }
                // ─────────────────────────────────────────────────────────────
            }
        }
    }

    private fun setupOnBackPressed() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.webView.canGoBack()) {
                    binding.webView.goBack()
                } else {
                    finish()
                }
            }
        })
    }

    /**
     * Safely launch the device UPI app chooser for a given upi:// URL.
     *
     * Flow:
     *  1. Build a VIEW intent for the UPI URI.
     *  2. Query PackageManager — if NO app can handle it, show a Snackbar and return.
     *  3. If exactly one app is installed, launch it directly (no chooser popup).
     *  4. If multiple apps are installed, open an Intent.createChooser() so the user
     *     picks their preferred UPI app (GPay, PhonePe, Paytm, BHIM, etc.).
     *  5. FLAG_ACTIVITY_NEW_TASK ensures the intent works from any execution context.
     *
     * Never silently swallows failures — always gives the user visible feedback.
     */
    private fun launchUpiIntent(upiUrl: String) {
        val uri = try {
            android.net.Uri.parse(upiUrl)
        } catch (e: Exception) {
            Log.e(TAG, "[UPI] Failed to parse UPI URI: $upiUrl", e)
            showUpiError("Invalid payment link. Please try again.")
            return
        }

        val upiIntent = Intent(Intent.ACTION_VIEW, uri).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        // ── Check which apps can handle this UPI intent ──────────────────────
        val resolveFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PackageManager.MATCH_ALL
        } else {
            0
        }

        val availableApps = packageManager.queryIntentActivities(upiIntent, resolveFlag)

        Log.d(TAG, "[UPI] Apps that can handle UPI intent: ${availableApps.size}")
        availableApps.forEach { resolveInfo ->
            Log.d(TAG, "[UPI]   → ${resolveInfo.activityInfo.packageName}")
        }

        if (availableApps.isEmpty()) {
            Log.w(TAG, "[UPI] No UPI app found on device. URL was: $upiUrl")
            showUpiError(
                "No UPI app found. Please install Google Pay, PhonePe, Paytm, or BHIM to pay online."
            )
            return
        }

        // ── Launch chooser (or direct launch if only one app) ────────────────
        try {
            if (availableApps.size == 1) {
                // Only one UPI app — launch directly without chooser overhead
                Log.d(TAG, "[UPI] Launching single UPI app: ${availableApps[0].activityInfo.packageName}")
                startActivity(upiIntent)
            } else {
                // Multiple apps — let user pick
                Log.d(TAG, "[UPI] Opening chooser with ${availableApps.size} UPI apps")
                val chooser = Intent.createChooser(upiIntent, "Pay with UPI")
                    .apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
                startActivity(chooser)
            }
            Log.d(TAG, "[UPI] Intent launched successfully for: $upiUrl")
        } catch (e: Exception) {
            Log.e(TAG, "[UPI] Exception while launching UPI intent", e)
            showUpiError("Could not open the payment app. Please try again.")
        }
    }

    /**
     * Show a user-visible Snackbar when UPI launch fails.
     * Always called on the main thread via runOnUiThread.
     */
    private fun showUpiError(message: String) {
        runOnUiThread {
            Snackbar.make(binding.root, message, Snackbar.LENGTH_LONG)
                .setAction("OK") { /* dismiss */ }
                .setBackgroundTint(resources.getColor(android.R.color.holo_red_dark, theme))
                .setTextColor(resources.getColor(android.R.color.white, theme))
                .setActionTextColor(resources.getColor(android.R.color.white, theme))
                .show()
        }
    }

    private fun showNoInternetError() {
        val message = try {
            getString(R.string.error_no_internet)
        } catch (e: Exception) {
            "No Internet Connection"
        }
        val retry = try {
            getString(R.string.retry)
        } catch (e: Exception) {
            "Retry"
        }

        Snackbar.make(binding.root, message, Snackbar.LENGTH_INDEFINITE)
            .setAction(retry) {
                if (NetworkUtils.isNetworkAvailable(this)) {
                    binding.webView.loadUrl(HOME_URL)
                } else {
                    showNoInternetError()
                }
            }.show()
    }
}
