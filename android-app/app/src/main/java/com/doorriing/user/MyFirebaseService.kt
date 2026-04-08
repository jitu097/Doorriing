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

        Log.d("FCM", "Message received from: ${remoteMessage.from}")
        Log.d("FCM", "Data payload: ${remoteMessage.data}")

        val isAppForeground = ProcessLifecycleOwner.get().lifecycle.currentState
            .isAtLeast(Lifecycle.State.STARTED)

        val title = remoteMessage.data["title"]
            ?: remoteMessage.notification?.title
            ?: "Doorriing"
        val body = remoteMessage.data["body"]
            ?: remoteMessage.notification?.body
            ?: ""
        val type = remoteMessage.data["type"]
        val referenceId = remoteMessage.data["reference_id"]
        val url = remoteMessage.data["url"]

        // For notification-only background messages, Android system already renders it.
        val shouldShowLocalNotification = isAppForeground || remoteMessage.data.isNotEmpty()

        if (shouldShowLocalNotification) {
            NotificationHelper.showNotification(
                context = this,
                title = title,
                message = body,
                type = type,
                referenceId = referenceId,
                url = url
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
