package com.ayush2006128.foreground

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder

class ForegroundSensorService : Service() {
  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    startForeground(NOTIFICATION_ID, notification())
    isRunning = true
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    isRunning = true
    return START_STICKY
  }

  override fun onDestroy() {
    isRunning = false
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun notification(): Notification =
    Notification.Builder(this, CHANNEL_ID)
      .setContentTitle("AutoCom monitoring active")
      .setContentText("Fall detection is running in the background.")
      .setSmallIcon(android.R.drawable.ic_menu_info_details)
      .setOngoing(true)
      .setCategory(Notification.CATEGORY_SERVICE)
      .build()

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Background monitoring",
        NotificationManager.IMPORTANCE_LOW
      )
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
  }

  companion object {
    private const val CHANNEL_ID = "background-monitoring"
    private const val NOTIFICATION_ID = 7001

    @Volatile
    var isRunning: Boolean = false
      private set

    fun start(context: Context) {
      val intent = Intent(context, ForegroundSensorService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, ForegroundSensorService::class.java))
      isRunning = false
    }
  }
}
