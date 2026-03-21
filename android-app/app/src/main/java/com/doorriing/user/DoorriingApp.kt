package com.doorriing.user

import android.app.Application
import com.doorriing.user.utils.PrefsManager

class DoorriingApp : Application() {
    
    companion object {
        lateinit var prefs: PrefsManager
            private set
    }

    override fun onCreate() {
        super.onCreate()
        prefs = PrefsManager(this)
    }
}
