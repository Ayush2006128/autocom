package com.ayush2006128.foreground

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ForegroundServiceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ForegroundService")

    AsyncFunction("start") {
      ForegroundSensorService.start(requireNotNull(appContext.reactContext))
    }

    AsyncFunction("stop") {
      ForegroundSensorService.stop(requireNotNull(appContext.reactContext))
    }

    AsyncFunction("isRunning") {
      ForegroundSensorService.isRunning
    }
  }
}
