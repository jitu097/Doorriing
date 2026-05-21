package com.doorriing.user.activities

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatActivity
import com.doorriing.user.MainActivity
import com.doorriing.user.R

@SuppressLint("CustomSplashScreen")
class SplashActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        // Launch MainActivity immediately without artificial delay
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtras(this@SplashActivity.intent)
            data = this@SplashActivity.intent.data
        }
        startActivity(intent)
        finish()
    }
}
