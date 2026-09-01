import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

// ── Foreground notification display ────────────────────────────
// Must be called at module level (outside any component) so
// notifications received while the app is in the foreground
// are displayed as banners.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Android Notification Channels ──────────────────────────────

/**
 * Create the Android notification channels used by AutoCom.
 * Channels are idempotent — calling this multiple times is safe.
 */
async function setupAndroidChannels() {
  if (Platform.OS !== "android") return;

  // Default channel for GREEN / YELLOW alerts
  await Notifications.setNotificationChannelAsync("alerts", {
    name: "Fall Alerts",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: "default",
    enableVibrate: true,
    showBadge: true,
  });

  // Critical channel for RED / SOS alerts
  await Notifications.setNotificationChannelAsync("sos", {
    name: "SOS Emergency",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [
      0, 200, 100, 200, 100, 200, 300, 500, 100, 500, 100, 500, 300, 200, 100,
      200, 100, 200,
    ],
    sound: "default",
    enableVibrate: true,
    showBadge: true,
  });
}

// ── Push token registration ────────────────────────────────────

/**
 * Register for push notifications and return the Expo push token.
 *
 * - Creates Android notification channels
 * - Checks we're on a physical device
 * - Requests permission if not yet granted
 * - Fetches the Expo push token using the EAS project ID
 *
 * Returns `undefined` if registration fails (emulator, denied, etc.).
 */
export async function registerForPushNotificationsAsync(): Promise<
  string | undefined
> {
  // 1. Set up Android channels first (required before requesting permissions on Android 13+)
  await setupAndroidChannels();

  // 2. Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.warn(
      "[AutoCom] Push notifications require a physical device — skipping registration"
    );
    return undefined;
  }

  // 3. Check / request permissions
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn(
      "[AutoCom] Push notification permission not granted — skipping registration"
    );
    return undefined;
  }

  // 4. Get project ID from app config
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) {
    console.error(
      "[AutoCom] EAS project ID not found in app config — cannot get push token"
    );
    return undefined;
  }

  // 5. Fetch the Expo push token
  try {
    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    console.log("[AutoCom] Expo push token:", pushTokenData.data);
    return pushTokenData.data;
  } catch (e) {
    console.error("[AutoCom] Error fetching push token:", e);
    return undefined;
  }
}
