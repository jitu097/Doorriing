package com.doorriing.user

import android.app.Activity
import android.util.Log
import com.razorpay.Checkout
import org.json.JSONObject

/**
 * RazorpayPaymentManager
 *
 * Builds the Razorpay checkout options and opens the Native SDK sheet.
 * Payment result callbacks (onPaymentSuccess / onPaymentError) are received
 * by MainActivity, which implements PaymentResultWithDataListener — this is
 * the Razorpay SDK contract: the Activity passed to checkout.open() must
 * implement the listener interface. This class has no listener of its own.
 *
 * Flow:
 *  1. React detects Android WebView + bridge → calls window.AndroidAuth.initiateRazorpayPayment(JSON)
 *  2. AndroidAuthBridge stores pending context, calls startPayment() on UI thread
 *  3. checkout.open(activity, options) — Native SDK sheet opens
 *  4. User picks GPay / PhonePe / Paytm / BHIM → UPI app opens natively ✅
 *  5. SDK calls MainActivity.onPaymentSuccess / onPaymentError
 *  6. MainActivity verifies with backend and posts result back to React
 */
class RazorpayPaymentManager(private val activity: MainActivity) {

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
     *   - prefill: Object           (name, contact) — optional, used for autofill
     */
    fun startPayment(orderJson: String) {
        Log.d(TAG, "[Razorpay] startPayment called")

        try {
            val json            = JSONObject(orderJson)
            val razorpayOrderId = json.getString("razorpayOrderId")
            val amount          = json.getInt("amount")          // paise
            val currency        = json.optString("currency", "INR")
            val prefill         = json.optJSONObject("prefill")
            val name            = prefill?.optString("name", "Customer") ?: "Customer"
            val contact         = prefill?.optString("contact", "") ?: ""

            Log.d(TAG, "[Razorpay] Launching checkout — orderId=$razorpayOrderId amount=$amount currency=$currency")

            val checkout = Checkout()
            checkout.setKeyID(BuildConfig.RAZORPAY_KEY_ID)
            // NOTE: No setActivity() call — the SDK routes callbacks to the Activity
            // that implements PaymentResultWithDataListener (MainActivity in this case).
            // checkout.open(activity, options) wires it automatically.

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
            // Notify MainActivity directly so it can post the error back to React
            activity.onRazorpayStartError("Failed to open payment screen. Please try again.")
        }
    }
}
