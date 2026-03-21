package com.doorriing.user

import android.util.Log
import com.doorriing.user.network.FcmTokenRequest
import com.doorriing.user.network.RetrofitClient
import com.doorriing.user.repository.AuthRepository
import com.doorriing.user.utils.NotificationHelper
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

        // Handle data payload
        val title = remoteMessage.data["title"] ?: remoteMessage.notification?.title
        val body = remoteMessage.data["body"] ?: remoteMessage.notification?.body
        val url = remoteMessage.data["url"]

        NotificationHelper(this).showNotification(title, body, url)
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d("FCM", "New token generated: $token")
        
        // Save token locally
        sendTokenToBackend(token)
    }

    private fun sendTokenToBackend(token: String) {
        val userId = "current_user_id" // Ideally get this from prefs if logged in
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val request = FcmTokenRequest(userId, token)
                val response = authRepository.saveFcmToken(request)
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
