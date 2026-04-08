# Project Audit - Doorriing User App

## 1. Project Overview

Doorriing User App is a multi-client marketplace application with a React web frontend, a Node.js/Express backend, and an Android wrapper/client under `android-app/`. The codebase is organized around authenticated shopping, cart/checkout, orders, addresses, and bookings, with Supabase used for persistent data and Firebase used for authentication and messaging infrastructure.

The overall architecture is solid, but several production-critical flows are incomplete or miswired. The biggest gaps are the online payment confirmation path, notification delivery to users, and a few stale client/backend contracts in the Android module.

## 2. Tech Stack Used

- Frontend web: React 18, Vite, React Router, Firebase Auth, Zustand, Axios, Framer Motion, Lottie.
- Backend: Node.js, Express, Supabase, Firebase Admin SDK, Razorpay, WebSocket, compression, CORS.
- Android client: Kotlin, Jetpack Compose, Firebase Messaging, Firebase Auth, Retrofit, OkHttp.

## 3. Features Completed ✅

- Authentication on the web client is implemented with Firebase email/password and Google sign-in in `frontend/src/context/AuthContext.jsx` and `frontend/src/pages/auth/Login.jsx`.
- Auth persistence is effectively handled by Firebase browser auth state and token storage in localStorage in `frontend/src/context/AuthContext.jsx`.
- Protected routing exists in `frontend/src/routes/UserRoutes.jsx` and `frontend/src/routes/ProtectedRoute.jsx`.
- Core browsing and item loading are present in `frontend/src/pages/home/Home.jsx` with loading and error states.
- Cart and checkout flows exist and are wired through contexts and services in `frontend/src/context/CartContext.jsx`, `frontend/src/pages/cart/Checkout.jsx`, and `frontend/src/pages/cart/CheckoutPayment.jsx`.
- Order history, order details, order confirmation, and tracking screens are present in `frontend/src/pages/orders/OrdersList.jsx`, `frontend/src/pages/orders/OrderDetails.jsx`, `frontend/src/pages/orders/OrderConfirmation.jsx`, and `frontend/src/pages/orders/TrackOrder.jsx`.
- Backend order creation, cancellation, expiry handling, and notification record creation exist in `backend/src/modules/order/order.service.js`.
- Backend notification storage and CRUD endpoints exist in `backend/src/modules/notification/notification.service.js` and `backend/src/modules/notification/notification.routes.js`.
- Android Firebase configuration is present via `android-app/app/google-services.json`, and FCM service handling exists in `android-app/app/src/main/java/com/doorriing/user/MyFirebaseService.kt`.

## 4. Features Partially Completed ⚠️

- Profile editing UI exists, but the save action is a stub and does not persist changes in `frontend/src/pages/profile/Profile.jsx`.
- Online payment UI exists, but the Razorpay flow is only partially integrated and breaks after verification.
- Notification data is stored in the backend, but there is no visible web notification center or browser push flow.
- Mobile loading and service-worker behavior are present, but the web app does not implement a user-facing offline or notification experience.
- Android FCM token generation exists, but token sync is not aligned with the current backend API contract.

## 5. Features Missing ❌

- A real profile update API call from the web profile screen.
- A user-facing notification inbox or badge UI in the web app.
- Web push notification support using the browser Notification API or Firebase Cloud Messaging.
- A complete online payment finalization flow that creates a database order after Razorpay verification.
- A backend endpoint for the Android client’s `api/save-fcm-token` call.
- A consistent Android auth contract for the current backend; the Android client still points to `api/v1/auth/login` and `api/v1/auth/signup` while the inspected backend exposes Firebase-based `/api/auth/*` routes.

## 6. Critical Bugs Found 🚨

1. Razorpay verification path is broken. The web checkout verification call is sent to `/user/orders/verify-payment` in `frontend/src/pages/cart/CheckoutPayment.jsx`, while the shared order service points to `/order/verify-payment` in `frontend/src/services/order.service.js`, and the backend exposes `/api/user/orders/verify-payment` in `backend/src/routes/order.routes.js`. This is a route mismatch.
2. Payment verification does not create an order. `backend/src/controllers/order.controller.js` verifies the Razorpay signature and returns success, but it does not insert a finalized order record. The web UI then redirects using the Razorpay order id, not the database order id, which means order confirmation and order details can fail.
3. Profile saving is non-functional. `frontend/src/pages/profile/Profile.jsx` only logs `Saving profile:` and exits edit mode; there is no API update.
4. Backend CORS is fully open. `backend/src/app.js` uses `cors()` without an origin whitelist.
5. Razorpay webhook fallback secret is hardcoded. `backend/src/routes/order.routes.js` falls back to `your_webhook_secret` if the environment variable is missing.
6. The Android FCM token flow targets an endpoint that does not exist in the backend. `android-app/app/src/main/java/com/doorriing/user/network/ApiService.kt` posts to `api/save-fcm-token`, but no matching backend route was found.
7. The Android client also points to stale auth endpoints. The Android API service uses `api/v1/auth/login` and `api/v1/auth/signup`, which do not match the Firebase-based backend routes in `backend/src/routes/index.js` and `backend/src/modules/auth/auth.routes.js`.

## 7. Firebase Integration Status

Web frontend status: connected for authentication. `frontend/src/config/firebase.js` initializes Firebase Auth using environment variables, and `frontend/src/context/AuthContext.jsx` handles sign-in, Google login, token retrieval, and backend sync.

Backend status: connected for verification. `backend/src/config/firebaseAdmin.js` initializes Firebase Admin using service credentials, and `backend/src/middlewares/auth.middleware.js` verifies Firebase ID tokens.

Android status: partially connected. `android-app/app/google-services.json` is present and matches `com.doorriing.user`, and the Android module includes Firebase Messaging and Firebase Auth dependencies. However, the token and auth API calls are not aligned with the inspected backend contract.

SHA1/config note: the committed Android Firebase config contains a certificate hash in `google-services.json`, but SHA1 registration in the Firebase console cannot be verified from the repository alone.

## 8. Notification System Status

Backend storage: implemented. Order creation and cancellation create notification rows in Supabase, and notification CRUD endpoints exist.

Delivery: not implemented for the web app. There is no frontend notification center, no browser notification permission flow, and no Firebase Cloud Messaging integration in the web code.

Android delivery: partially implemented. `MyFirebaseService.kt` receives FCM messages and tries to upload tokens, but the backend endpoint it calls is missing.

Verdict: notification persistence exists, but user-visible delivery is incomplete.

## 9. Recommended Fixes (Priority-Wise)

1. Fix the online payment flow end to end.
   - Unify the verification route.
   - Create the order record after Razorpay signature verification.
   - Redirect to the actual database order id, not the Razorpay order id.

2. Implement a real profile update call.
   - Wire `frontend/src/pages/profile/Profile.jsx` to `PUT /api/auth/profile`.
   - Refresh local auth/customer state after save.

3. Add a proper notification delivery path.
   - Either implement browser push for the web app or add a visible in-app notification center.
   - Add token sync support for the Android client if that client remains in scope.

4. Lock down backend security defaults.
   - Restrict CORS to approved origins.
   - Remove the hardcoded webhook secret fallback.
   - Add rate limiting for auth and payment-sensitive routes.

5. Remove debug noise and tighten logging.
   - Remove `console.log`/`console.warn` statements from `frontend/src/pages/home/Home.jsx`.
   - Remove auth middleware debug logging in `backend/src/middlewares/auth.middleware.js`.

6. Align the Android client with the current backend.
   - Update auth endpoints.
   - Add a backend route for FCM token persistence or remove the stale token upload logic.

## 10. Next Development Roadmap

### Phase 1: Release blockers

- Fix Razorpay verification and order creation.
- Implement profile save.
- Secure CORS and webhook handling.

### Phase 2: User experience completion

- Add a notification inbox or push delivery.
- Improve order tracking refresh behavior.
- Clean up debug logs and stale placeholders.

### Phase 3: Client alignment

- Reconcile Android endpoints with the current backend.
- Decide whether Android is an official client or a separate experimental app.
- Remove dead or duplicate components after endpoint alignment is complete.

### Phase 4: Hardening

- Add rate limiting and request validation.
- Introduce automated tests around checkout, verify-payment, auth sync, and profile update.
- Document the Firebase and payment setup in a real root README.

## Readiness Check

- Is the app ready for production? No.
- What is blocking release? The payment verification flow is broken, the profile save action does nothing, notification delivery is incomplete, and the Android client is calling backend routes that do not exist.
- What should be done next immediately? Fix the online payment flow so verification creates the real order, wire profile updates to the backend, and close the notification/API contract gaps before any public launch.