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
    sound: SOS_SOUND,
    enableVibrate: true,
    showBadge: true,
  });
}

/** Start repeating critical notifications while a caregiver acknowledges an SOS. */
export async function startSosNotificationLoop(
  alertId: string,
  patientName: string
): Promise<void> {
  const existingNotificationId = sosLoopNotificationIds.get(alertId);
  if (existingNotificationId) return;

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "🔴 EMERGENCY SOS",
      body: `${patientName} needs immediate help! Tap to acknowledge.`,
      sound: SOS_SOUND,
      data: { screen: "caregiver", alertId, alertSeverity: "red" },
      ...(Platform.OS === "android" ? { channelId: SOS_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: SOS_REPEAT_SECONDS,
      repeats: true,
    },
  });
  sosLoopNotificationIds.set(alertId, notificationId);
}

/** Stop all repeating SOS notifications after caregiver acknowledgement. */
export async function stopSosNotificationLoop(): Promise<void> {
  await Promise.all(
    [...sosLoopNotificationIds.values()].map((id) =>
      Notifications.cancelScheduledNotificationAsync(id)
    )
  );
  sosLoopNotificationIds.clear();
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

// ── Notification Categories (Interactive Actions) ──────────────

/** Category identifier for patient fall alerts */
export const ALERT_CATEGORY_ID = "patient_fall_alert";

/** Action identifier for the "I'm OK" button */
export const IM_OK_ACTION_ID = "im_ok_dismiss";
export const SOS_CHANNEL_ID = "sos";
const SOS_SOUND = "sos_alarm.wav";
const SOS_REPEAT_SECONDS = 4;
const sosLoopNotificationIds = new Map<string, string>();

/**
 * Register the notification category with an "I'm OK" action button.
 * Must be called once before scheduling notifications with this category.
 * Safe to call multiple times (idempotent).
 */
export async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(ALERT_CATEGORY_ID, [
    {
      identifier: IM_OK_ACTION_ID,
      buttonTitle: "I'm OK 👍",
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}

// ── Local Patient Notifications ────────────────────────────────

/**
 * Send a local notification to the patient with an "I'm OK" action button.
 * Used during alert escalation to give the patient a chance to cancel.
 *
 * @param severity - The current alert severity ("green" | "yellow" | "red")
 * @param alertId - The Firestore alert document ID (passed as data for the handler)
 */
export async function sendPatientAlertNotification(
  severity: "green" | "yellow" | "red",
  alertId: string
): Promise<string> {
  const content: Record<string, unknown> = {
    data: { alertId, screen: "patient", action: "escalation" },
    categoryIdentifier: ALERT_CATEGORY_ID,
  };

  if (severity === "green") {
    content.title = "🟢 Fall Detected";
    content.body = "Are you okay? Tap \"I'm OK\" if you're fine.";
    content.sound = "default";
  } else if (severity === "yellow") {
    content.title = "🟡 Are You OK?";
    content.body =
      "Your caregivers are being asked to check on you. Tap \"I'm OK\" to cancel.";
    content.sound = "default";
  } else {
    content.title = "🔴 SOS Active";
    content.body =
      "Emergency SOS has been triggered. Tap \"I'm OK\" if you're safe.";
    content.sound = SOS_SOUND;
    content.data = {
      alertId,
      screen: "patient",
      action: "escalation",
    };
  }

  return await Notifications.scheduleNotificationAsync({
    content: content as Notifications.NotificationContentInput,
    trigger: null, // Deliver immediately
  });
}

/**
 * Dismiss all currently displayed notifications.
 * Called when the patient cancels an alert to clear stale notifications.
 */
export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
