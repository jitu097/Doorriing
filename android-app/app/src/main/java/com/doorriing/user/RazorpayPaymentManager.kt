package com.doorriing.user

import android.app.Activity
import android.util.Log
import com.razorpay.Checkout
import com.razorpay.PaymentData
import com.razorpay.PaymentResultWithDataListener
import org.json.JSONObject

/**
 * RazorpayPaymentManager
 *
 * Owns all Razorpay Native SDK logic. Isolated from MainActivity to keep
 * concerns separate and make future SDK upgrades easy.
 *
 * Flow:
 *  1. React (CheckoutPayment.jsx) detects Android WebView + bridge available
 *  2. React calls: window.AndroidAuth.initiateRazorpayPayment(orderJson)
 *  3. AndroidAuthBridge (in MainActivity) receives the JSON on a background thread
 *  4. runOnUiThread → RazorpayPaymentManager.startPayment(orderJson)
 *  5. Checkout.open(activity, options) — Razorpay Native SDK sheet opens
 *  6. User picks GPay / PhonePe / Paytm / BHIM → UPI app opens natively ✅
 *  7. onPaymentSuccess / onPaymentError callbacks fire
 *  8. MainActivity handles verification / error feedback to React
 */
class RazorpayPaymentManager(
    private val activity: MainActivity,
    private val onSuccess: (paymentId: String, orderId: String, signature: String) -> Unit,
    private val onError: (code: Int, description: String) -> Unit
) : PaymentResultWithDataListener {

    companion object {
        private const val TAG = "RazorpayPaymentManager"

        // Preload Razorpay resources at app launch for faster first-open.
        // Call this once from MainActivity.onCreate().
        fun preload(activity: Activity) {
            Checkout.preload(activity.applicationContext)
            Log.d(TAG, "[Razorpay] SDK preloaded")
        }
    }

    /**
     * Open the Razorpay Native checkout sheet.
     *
     * @param orderJson JSON string passed from the React JS bridge containing:
     *   - razorpayOrderId: String   (rzp_order_... from backend)
     *   - amount: Int               (amount in paise)
     *   - currency: String          (INR)
     *   - addressId: String         (Supabase address UUID)
     *   - pricing: Object           (subtotal, deliveryFee, convenienceFee, finalAmount)
     *   - prefill: Object           (name, contact) — optional, used for autofill
     */
    fun startPayment(orderJson: String) {
        Log.d(TAG, "[Razorpay] startPayment called")

        try {
            val json = JSONObject(orderJson)
            val razorpayOrderId = json.getString("razorpayOrderId")
            val amount          = json.getInt("amount")          // paise
            val currency        = json.optString("currency", "INR")
            val prefill         = json.optJSONObject("prefill")
            val name            = prefill?.optString("name", "Customer") ?: "Customer"
            val contact         = prefill?.optString("contact", "") ?: ""

            Log.d(TAG, "[Razorpay] Launching checkout — orderId=$razorpayOrderId amount=$amount currency=$currency")

            val checkout = Checkout()
            checkout.setKeyID(BuildConfig.RAZORPAY_KEY_ID)
            // Activity is set per-open so the SDK can handle the result callback.
            checkout.setActivity(activity, this)

            val options = JSONObject().apply {
                put("name",        "Doorriing")
                put("description", "Order Payment")
                put("order_id",    razorpayOrderId)
                put("amount",      amount)
                put("currency",    currency)
                put("theme",       JSONObject().apply { put("color", "#3399cc") })

                // Prefill from address data supplied by React
                put("prefill", JSONObject().apply {
                    put("name",    name)
                    put("contact", contact)
                    // email is not required for UPI Intent flow
                })

                // UPI-first display config — mirrors the frontend options block.
                // Forces UPI as the first tab in the native sheet.
                put("config", JSONObject().apply {
                    put("display", JSONObject().apply {
                        put("blocks", JSONObject().apply {
                            put("upi", JSONObject().apply {
                                put("name", "Pay using UPI")
                                put("instruments", org.json.JSONArray().apply {
                                    put(JSONObject().apply { put("method", "upi") })
                                })
                            })
                            put("other", JSONObject().apply {
                                put("name", "Other Payment Methods")
                                put("instruments", org.json.JSONArray().apply {
                                    put(JSONObject().apply { put("method", "card") })
                                    put(JSONObject().apply { put("method", "netbanking") })
                                    put(JSONObject().apply { put("method", "wallet") })
                                })
                            })
                        })
                        put("sequence", org.json.JSONArray().apply {
                            put("block.upi")
                            put("block.other")
                        })
                        put("preferences", JSONObject().apply {
                            put("show_default_blocks", false)
                        })
                    })
                })
            }

            Log.d(TAG, "[Razorpay] Options built — opening native checkout sheet")
            checkout.open(activity, options)

        } catch (e: Exception) {
            Log.e(TAG, "[Razorpay] startPayment exception", e)
            onError(-1, "Failed to open payment screen. Please try again.")
        }
    }

    // ── PaymentResultWithDataListener callbacks ──────────────────────────────

    /**
     * Called by the Razorpay SDK when the user completes payment successfully.
     * Delegates to MainActivity which will call the backend /verify-payment.
     */
    override fun onPaymentSuccess(razorpayPaymentId: String?, data: PaymentData?) {
        val paymentId = razorpayPaymentId ?: ""
        val orderId   = data?.orderId   ?: ""
        val signature = data?.signature ?: ""

        Log.d(TAG, "[Razorpay] onPaymentSuccess — paymentId=$paymentId orderId=$orderId")

        if (paymentId.isBlank() || orderId.isBlank() || signature.isBlank()) {
            Log.e(TAG, "[Razorpay] onPaymentSuccess called with incomplete data — paymentId=$paymentId orderId=$orderId signature=${signature.take(10)}")
            onError(-1, "Payment data incomplete. Please contact support.")
            return
        }

        onSuccess(paymentId, orderId, signature)
    }

    /**
     * Called by the Razorpay SDK when payment fails or is cancelled.
     * The cart is NOT cleared — the user can retry.
     */
    override fun onPaymentError(code: Int, description: String?, data: PaymentData?) {
        val reason = description ?: "Payment failed"
        Log.w(TAG, "[Razorpay] onPaymentError — code=$code description=$description")
        onError(code, reason)
    }
}
