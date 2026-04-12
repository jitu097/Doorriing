package com.doorriing.user

import android.util.Log
import com.doorriing.user.network.FcmTokenRequest
import com.doorriing.user.network.RetrofitClient
import com.doorriing.user.repository.AuthRepository
import com.doorriing.user.utils.NotificationHelper
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.lifecycle.Lifecycle
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MyFirebaseService : FirebaseMessagingService() {

    private val authRepository: AuthRepository by lazy {
        AuthRepository(RetrofitClient.instance)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        Log.d("FCM", "Received data: ${remoteMessage.data}")
        Log.d("FCM", "Received notification: ${remoteMessage.notification?.title}")

        // Handle both Payload Types (Fallback logic)
        val title = remoteMessage.notification?.title ?: remoteMessage.data["title"]
        val body = remoteMessage.notification?.body ?: remoteMessage.data["body"]

        val type = remoteMessage.data["type"]
        val referenceId = remoteMessage.data["reference_id"]
        val targetUrl = remoteMessage.data["target_url"] ?: remoteMessage.data["url"]

        if (title != null || body != null) {
            NotificationHelper(this).showNotification(
                title = title ?: "Doorriing",
                body = body ?: "",
                type = type,
                referenceId = referenceId,
                url = targetUrl
            )
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d("FCM", "New token generated: $token")

        sendTokenToServer(token)
    }

    private fun sendTokenToServer(token: String) {
        val authToken = DoorriingApp.prefs.getToken()
        if (authToken.isNullOrBlank()) {
            Log.w("FCM", "Skipping token sync: user auth token not found")
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val request = FcmTokenRequest(
                    fcmToken = token,
                    deviceType = "android"
                )
                val response = authRepository.saveFcmToken(authToken, request)
                if (response.isSuccessful) {
                    Log.d("FCM", "Token saved to backend successfully")
                } else {
                    Log.e("FCM", "Failed to save token: ${response.errorBody()?.string()}")
                }
            } catch (e: Exception) {
                Log.e("FCM", "Error sending token to backend", e)
            }
        }
    }
}
