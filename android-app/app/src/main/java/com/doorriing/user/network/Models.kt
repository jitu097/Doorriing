package com.doorriing.user.network

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class LoginResponse(
    @SerializedName("status") val status: String,
    @SerializedName("token") val token: String,
    @SerializedName("user") val user: User
)

data class SignupRequest(
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String,
    @SerializedName("phone") val phone: String
)

data class User(
    @SerializedName("_id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String
)

data class FcmTokenRequest(
    @SerializedName("fcm_token") val fcmToken: String,
    @SerializedName("device_type") val deviceType: String = "android"
)

data class ApiResponse<T>(
    @SerializedName("status") val status: String,
    @SerializedName("data") val data: T?,
    @SerializedName("message") val message: String?
)

// ── Razorpay Native SDK models ─────────────────────────────────────────────
// Used by RazorpayPaymentManager to call the same backend endpoints
// that the frontend React app uses. No backend changes required.

/** Request body for POST /api/v1/user/orders/initiate-payment */
data class InitiatePaymentRequest(
    @SerializedName("amount") val amount: Double
)

/** Response from POST /api/v1/user/orders/initiate-payment */
data class RazorpayOrderResponse(
    @SerializedName("id") val id: String,           // Razorpay order_id (rzp_order_...)
    @SerializedName("amount") val amount: Int,       // amount in paise
    @SerializedName("currency") val currency: String,
    @SerializedName("status") val status: String
)

/** Pricing breakdown passed to verify-payment (mirrors the frontend payload) */
data class PricingData(
    @SerializedName("subtotal") val subtotal: Double,
    @SerializedName("deliveryFee") val deliveryFee: Double,
    @SerializedName("convenienceFee") val convenienceFee: Double,
    @SerializedName("finalAmount") val finalAmount: Double
)

/** Request body for POST /api/v1/user/orders/verify-payment */
data class VerifyPaymentRequest(
    @SerializedName("razorpay_order_id") val razorpayOrderId: String,
    @SerializedName("razorpay_payment_id") val razorpayPaymentId: String,
    @SerializedName("razorpay_signature") val razorpaySignature: String,
    @SerializedName("addressId") val addressId: String,
    @SerializedName("pricing") val pricing: PricingData
)

/** The `data` object inside the verify-payment response */
data class VerifyPaymentData(
    @SerializedName("orderId") val orderId: String?,
    @SerializedName("orderNumber") val orderNumber: String?,
    @SerializedName("status") val status: String?,
    @SerializedName("paymentStatus") val paymentStatus: String?
)
// ──────────────────────────────────────────────────────────────────────────
