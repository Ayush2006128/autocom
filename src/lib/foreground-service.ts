import { Platform } from "react-native";
import ForegroundService from "../../modules/foreground-service/src/ForegroundServiceModule";

export async function startForegroundMonitoring(): Promise<void> {
  if (Platform.OS === "android") {
    await ForegroundService.start();
  }
}

export async function stopForegroundMonitoring(): Promise<void> {
  if (Platform.OS === "android") {
    await ForegroundService.stop();
  }
}

export async function isForegroundMonitoringRunning(): Promise<boolean> {
  return Platform.OS === "android" && (await ForegroundService.isRunning());
}
