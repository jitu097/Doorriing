package com.doorriing.user

import android.app.Application
import com.doorriing.user.utils.PrefsManager
import com.doorriing.user.utils.NotificationHelper

class DoorriingApp : Application() {
    
    companion object {
        lateinit var prefs: PrefsManager
            private set
    }

    override fun onCreate() {
        super.onCreate()
        prefs = PrefsManager(this)
        NotificationHelper.registerChannel(this)
    }
}
