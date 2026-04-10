# BazarSe_User Android Wrapper Analysis

This document describes the Android + React hybrid architecture used in the `BazarSe_User` project folder. The implementation is a thin native Android shell that hosts a React web app in a `WebView`, while native code handles launch, Google Sign-In, Firebase Cloud Messaging, notification routing, and token handoff.

## 1. High-Level Architecture

The runtime shape of the app is:

`Android launch -> SplashActivity -> MainActivity -> WebView loads hosted React app -> React app owns UI/auth/routing -> Android owns notifications and native Google sign-in bridge`

The important design choice is that Android does not implement the product UI natively. The Android layer is a wrapper around the hosted SPA at `https://doorriing.com`, with a small bridge used for authentication and notification deep linking.

## 2. Android Project Structure

The active Android project is `android-app/`.

### Top-level Android files

- `android-app/build.gradle.kts` defines the Android Gradle Plugin, Kotlin plugin, and Google Services plugin.
- `android-app/settings.gradle.kts` includes the single `:app` module.
- `android-app/gradle.properties` contains standard Gradle and AndroidX flags.

### App module layout

- `android-app/app/src/main/AndroidManifest.xml` declares permissions, the `Application` class, the Firebase service, the splash activity, and the main activity.
- `android-app/app/src/main/java/com/doorriing/user/` contains the runtime classes.
- `android-app/app/src/main/res/layout/` contains `activity_main.xml` and `activity_splash.xml`.
- `android-app/app/src/main/res/xml/` contains `network_security_config.xml`.
- `android-app/app/src/main/res/values/` contains theme, colors, and strings.
- `android-app/app/google-services.json` contains Firebase config for both `com.doorriing.user` and `com.doorriing.seller` package entries.

### Key Android classes

- `DoorriingApp.kt`: application bootstrap.
- `SplashActivity.kt`: 2-second splash screen.
- `MainActivity.kt`: WebView host, auth bridge, notification routing, FCM token sync.
- `MyFirebaseService.kt`: FirebaseMessagingService implementation.
- `NotificationHelper.kt`: notification channel and notification builder.
- `PrefsManager.kt`: encrypted token storage.
- `NetworkUtils.kt`: connectivity checks.
- `ApiService.kt`, `RetrofitClient.kt`, `AuthRepository.kt`, `Models.kt`: backend token sync and auth request/response types.

## 3. WebView Integration

### App loading

The Android app loads the hosted site directly:

- Base URL in `MainActivity`: `https://doorriing.com`
- `MainActivity.handleIntent()` falls back to loading this URL when no notification route is present.

### WebView configuration

`MainActivity.setupWebView()` enables:

- JavaScript
- DOM storage
- database support
- file/content access
- wide viewport
- overview mode
- default cache mode

The view layout is minimal: a full-screen `WebView` with a centered `ProgressBar` layered above it.

### WebView navigation handling

- Google Accounts URLs are intercepted in `shouldOverrideUrlLoading()` and opened externally in a browser.
- This avoids trying to complete Google auth inside the WebView.

### JS bridge

The Android bridge is exposed as `AndroidAuth`.

Available methods:

- `startGoogleSignIn()`
- `saveAuthToken(token)`

Android calls back into JavaScript using:

- `window.onNativeGoogleLoginSuccess(idToken)`
- `window.onNativeGoogleLoginError(message)`

This is the only explicit native bridge in the project.

## 4. Firebase Integration

### Firebase setup location

Firebase configuration lives in:

- `android-app/app/google-services.json`

The file includes Firebase client entries for both:

- `com.doorriing.user`
- `com.doorriing.seller`

### Native Firebase dependencies

`android-app/app/build.gradle.kts` includes:

- `firebase-messaging`
- `firebase-analytics`
- `firebase-auth`
- `play-services-auth`

### Initialization

Firebase itself is not manually initialized in code. Instead:

- The Google Services Gradle plugin processes `google-services.json`.
- `FirebaseAuth.getInstance()` is created inside `MainActivity`.
- `FirebaseMessaging.getInstance()` is used to fetch the device token.
- The `FirebaseMessagingService` subclass receives incoming FCM messages.

### Notification channel setup

`DoorriingApp.onCreate()` calls `NotificationHelper.registerChannel(this)`.

The channel:

- ID: `default_channel`
- Name: `General Notifications`
- Description: `Notifications for orders and updates`
- Importance: `HIGH`

### Message handling

`MyFirebaseService.onMessageReceived()` reads:

- `title`
- `body`
- `type`
- `reference_id`
- `url`

It logs the payload and decides whether to show a local notification.

The current logic shows a local notification when either:

- the app is in foreground, or
- the message contains a data payload

This means the app favors native rendering for active delivery of data messages.

### Token sync

`MyFirebaseService.onNewToken()` sends the refreshed FCM token to the backend only if an auth token already exists in secure prefs.

The token sync request is sent through Retrofit to the backend auth/notification API.

## 5. Notification Routing System

### Native tap flow

1. FCM message arrives.
2. `MyFirebaseService` creates a local notification through `NotificationHelper`.
3. The notification uses a `PendingIntent` that opens `MainActivity`.
4. The intent includes extras:
   - `type`
   - `reference_id`
   - `target_url`
5. `MainActivity.handleIntent()` reads those extras.
6. The activity loads the appropriate WebView URL.

### Routing rules

`MainActivity.navigateFromNotification()` maps:

- `order_placed`
- `order_accepted`
- `order_confirmed`
- `order_shipped`
- `order_delivered`

to:

- `/orders/{referenceId}` when a reference ID is present
- `/orders` when no reference ID is present

`offer` maps to:

- `/offers`

Any unrecognized type falls back to the base URL.

### Handling when WebView is not ready

There is no separate queue or deferred routing layer. The code assumes the `WebView` binding is ready by the time `handleIntent()` executes. The logic directly calls `loadUrl()` on the current `WebView` instance.

### Important design detail

The native layer does not hand route commands into React state. It resolves them by loading a URL into the WebView.

## 6. WebView <-> Android Communication Flow

### Native Google sign-in

Android owns the native Google login UI when the web app requests it.

Flow:

1. React calls `window.AndroidAuth.startGoogleSignIn()`.
2. Android launches Google sign-in using `GoogleSignInClient`.
3. The Google account returns an ID token.
4. Android signs into Firebase Auth using that ID token.
5. Android gets a Firebase ID token from `FirebaseAuth`.
6. Android injects that token back into the page via `window.onNativeGoogleLoginSuccess()`.
7. The web app signs in with `signInWithCredential()`.

### Auth token handoff back to Android

When the React auth state changes, the web app sends its Firebase auth token back to Android:

1. React calls `window.AndroidAuth.saveAuthToken(token)`.
2. Android stores the token in encrypted shared preferences.
3. Android uses that token later when syncing the FCM token to the backend.

### Why the bridge matters

This means the web app remains the source of truth for the user session, but the Android shell keeps a native copy of the auth token so it can support push registration and backend sync.

## 7. Google Sign-In Flow

The sign-in flow is hybrid and intentionally split.

### On Android

- `MainActivity` builds a `GoogleSignInClient` using `R.string.default_web_client_id`.
- The sign-in request uses `requestIdToken()` and `requestEmail()`.
- After Google sign-in succeeds, Android uses `GoogleAuthProvider.getCredential()`.
- Android signs into Firebase Auth.
- Android extracts the Firebase ID token and sends it to the web layer.

### On web/desktop

- The React app falls back to `signInWithPopup()`.

### Native bridge contract

The React auth context is explicitly prepared for native sign-in by defining:

- `window.onNativeGoogleLoginSuccess`
- `window.onNativeGoogleLoginError`

The login function also detects `window.AndroidAuth` or `window.Android` and uses the native bridge if present.

## 8. App Lifecycle Handling

### Closed / killed

- FCM messages still arrive through `FirebaseMessagingService`.
- Notification taps open `MainActivity` and pass routing data in the intent extras.

### Background

- Notification taps are handled by the same native intent path.
- `TaskStackBuilder` preserves a consistent back stack.

### Foreground

- `MyFirebaseService` can show a local notification even while the app is active.
- The WebView remains the visible surface, so notification taps can route directly to the desired page.

### State preservation

- Auth token is stored in encrypted shared preferences.
- The web app also stores the token in browser storage.
- `onNewIntent()` ensures notification tap handling is reused rather than ignored when the activity is already alive.

## 9. Permissions and Manifest

### Permissions declared

- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE`
- `android.permission.POST_NOTIFICATIONS`

The manifest also removes the advertising ID permission added by dependencies:

- `com.google.android.gms.permission.AD_ID` is removed with `tools:node="remove"`

### Application-level config

`AndroidManifest.xml` sets:

- `android:name=".DoorriingApp"`
- custom theme
- network security config
- `usesCleartextTraffic="false"`

### Activity declarations

- `SplashActivity` is the launcher activity.
- `MainActivity` is not exported.

### Service declaration

- `MyFirebaseService` listens for `com.google.firebase.MESSAGING_EVENT`

## 10. Error Handling and Stability

This app is stable mostly because it keeps the native layer very small and defensive.

Key safeguards:

- Notification permission is checked before posting on Android 13+.
- Notification posting is wrapped in a `try/catch` that swallows `SecurityException` when permission is missing.
- Encrypted shared preferences are used for the auth token.
- Internet availability is checked before loading the base URL.
- Google auth URLs are handled outside the WebView.
- FCM token sync is skipped until auth is available, preventing broken backend writes.
- `TaskStackBuilder` provides predictable notification tap behavior.
- `onNewIntent()` keeps notification routing consistent when the activity already exists.
- The splash activity is short and simple, so startup logic is not fragmented.

The front-end side also contributes to stability by isolating auth and notification concerns into context/services rather than scattering them across pages.

## 11. What Must Be Copied Exactly for a Seller App Clone

If the goal is to replicate this architecture for another app without using legacy bridge tooling, the essential pieces are:

- Native splash activity before the WebView host
- One `MainActivity` that owns the WebView and native bridge
- `AndroidAuth` bridge name
- `onNativeGoogleLoginSuccess` and `onNativeGoogleLoginError` callback names
- Native Google Sign-In using the web client ID
- FirebaseAuth sign-in after Google sign-in
- Encrypted shared preferences for the auth token
- Notification channel creation at app startup
- FCM service that reads `type`, `reference_id`, and `url`
- Notification tap routing via intent extras into `MainActivity`
- `TaskStackBuilder` for notification pending intents
- `onNewIntent()` intent reprocessing
- Web app support for native login and token handoff

## 12. What Can Be Customized

These are implementation details that can change without breaking the core pattern:

- App name and branding
- Splash artwork and theme colors
- Base host URL
- Notification text
- Route names, as long as Android and web stay in sync
- Backend token sync endpoint paths
- The exact route mapping for notification types
- The loading/progress UI inside the WebView

## 13. Bottom Line

This project is not a heavy native app and not a generic cross-platform wrapper in the runtime path. It is a stable native Android WebView shell with:

- native Google login integration
- Firebase token handling
- local notification rendering
- notification deep-link routing into the hosted web app
- a small and explicit JS bridge for auth token exchange

That is why it is a strong pattern to copy for a second app if you want the same Android wrapper behavior without introducing a larger native framework layer.