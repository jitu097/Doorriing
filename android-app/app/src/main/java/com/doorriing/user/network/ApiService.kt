package com.doorriing.user.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface ApiService {
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("api/auth/signup")
    suspend fun signup(@Body request: SignupRequest): Response<LoginResponse>

    @POST("api/notification/save-token")
    suspend fun saveFcmToken(
        @Header("Authorization") authorization: String,
        @Body request: FcmTokenRequest
    ): Response<ApiResponse<Unit>>

    // ── Razorpay payment endpoints ─────────────────────────────────────────
    // These call the same backend routes that the React frontend uses.
    // No backend changes are required — only the Android side is new.

    /**
     * Create a Razorpay order on the backend.
     * Mirrors: POST /api/user/orders/initiate-payment
     */
    @POST("api/user/orders/initiate-payment")
    suspend fun initiatePayment(
        @Header("Authorization") authorization: String,
        @Body request: InitiatePaymentRequest
    ): Response<RazorpayOrderResponse>

    /**
     * Verify Razorpay HMAC signature and create the DB order.
     * Mirrors: POST /api/user/orders/verify-payment
     */
    @POST("api/user/orders/verify-payment")
    suspend fun verifyPayment(
        @Header("Authorization") authorization: String,
        @Body request: VerifyPaymentRequest
    ): Response<ApiResponse<VerifyPaymentData>>
    // ──────────────────────────────────────────────────────────────────────
}
