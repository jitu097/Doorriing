package com.doorriing.user.utils

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.TaskStackBuilder
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.doorriing.user.MainActivity
import com.doorriing.user.R

class NotificationHelper(private val context: Context) {

    companion object {
        const val CHANNEL_ID = "default_channel"
        private const val CHANNEL_NAME = "General Notifications"
        private const val CHANNEL_DESC = "Notifications for orders and updates"

        fun registerChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = CHANNEL_DESC
                }

                val notificationManager =
                    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.createNotificationChannel(channel)
            }
        }

        fun showNotification(
            context: Context,
            title: String,
            message: String,
            type: String? = null,
            referenceId: String? = null,
            url: String? = null
        ) {
            registerChannel(context)

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("type", type)
                putExtra("reference_id", referenceId)
                putExtra("target_url", url)
            }

            val pendingIntent = TaskStackBuilder.create(context).run {
                addNextIntentWithParentStack(intent)
                getPendingIntent(
                    System.currentTimeMillis().toInt(),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
            }

            val builder = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)

            try {
                with(NotificationManagerCompat.from(context)) {
                    notify(System.currentTimeMillis().toInt(), builder.build())
                }
            } catch (_: SecurityException) {
                // No-op when notification runtime permission is denied.
            }
        }
    }

    init {
        registerChannel(context)
    }

    fun showNotification(
        title: String?,
        body: String?,
        type: String? = null,
        referenceId: String? = null,
        url: String? = null
    ) {
        showNotification(
            context = context,
            title = title ?: "Doorriing",
            message = body ?: "",
            type = type,
            referenceId = referenceId,
            url = url
        )
    }
}
