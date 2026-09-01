/**
 * AutoCom — Firebase Cloud Functions
 *
 * Triggers on `alerts` collection writes and sends Expo push notifications
 * to all caregivers linked to the patient.
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

initializeApp();
const db = getFirestore();

// ── Types ──────────────────────────────────────────────────────

interface AlertData {
  patientUid: string;
  patientName: string;
  severity: "green" | "yellow" | "red";
  status: "active" | "cancelled" | "resolved";
}

interface UserData {
  role: "patient" | "caregiver";
  patientId?: string;
  linkedPatientId?: string;
  expoPushToken?: string;
  displayName: string;
}

// ── Notification messages by severity ──────────────────────────

const SEVERITY_MESSAGES: Record<string, (name: string) => { title: string; body: string }> = {
  green: (name) => ({
    title: "⚠️ Fall Detected",
    body: `I think you should call ${name}`,
  }),
  yellow: (name) => ({
    title: "🟡 Urgent — No Response",
    body: `Sir/Ma'am You should go back to ${name}`,
  }),
  red: (name) => ({
    title: "🔴 EMERGENCY SOS",
    body: `${name} needs immediate help! SOS alert active.`,
  }),
};

// ── Expo Push API helper ───────────────────────────────────────

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  priority?: "default" | "normal" | "high";
  channelId?: string;
}

/**
 * Send push notifications via the Expo Push API.
 * Batches up to 100 messages per request (Expo limit).
 */
async function sendExpoPushNotifications(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  // Batch into chunks of 100
  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json();

      if (result.errors) {
        logger.error("Expo Push API errors:", result.errors);
      }

      // Log individual ticket statuses
      if (result.data) {
        for (let i = 0; i < result.data.length; i++) {
          const ticket = result.data[i];
          if (ticket.status === "error") {
            logger.error(
              `Push ticket error for token ${chunk[i].to}:`,
              ticket.message,
              ticket.details
            );
          }
        }
      }
    } catch (error) {
      logger.error("Failed to send Expo push notifications:", error);
    }
  }
}

// ── Helper: find caregivers & send notifications ───────────────

/**
 * Given a patient UID and alert data, find all linked caregivers
 * and send them push notifications.
 */
async function notifyCaregivers(alert: AlertData): Promise<void> {
  // 1. Get the patient's patientId (6-char code)
  const patientSnap = await db.collection("users").doc(alert.patientUid).get();
  if (!patientSnap.exists) {
    logger.warn(`Patient doc not found for UID: ${alert.patientUid}`);
    return;
  }
  const patientData = patientSnap.data() as UserData;
  const patientCode = patientData.patientId;

  if (!patientCode) {
    logger.warn(`Patient ${alert.patientUid} has no patientId code`);
    return;
  }

  // 2. Find all caregivers linked to this patient
  const caregiversSnap = await db
    .collection("users")
    .where("role", "==", "caregiver")
    .where("linkedPatientId", "==", patientCode)
    .get();

  if (caregiversSnap.empty) {
    logger.info(`No caregivers linked to patient ${patientCode}`);
    return;
  }

  // 3. Collect push tokens
  const tokens: string[] = [];
  caregiversSnap.forEach((doc) => {
    const data = doc.data() as UserData;
    if (data.expoPushToken) {
      tokens.push(data.expoPushToken);
    }
  });

  if (tokens.length === 0) {
    logger.info(
      `Caregivers found for patient ${patientCode}, but none have push tokens`
    );
    return;
  }

  // 4. Build notification messages
  const messageConfig = SEVERITY_MESSAGES[alert.severity];
  if (!messageConfig) {
    logger.warn(`Unknown severity: ${alert.severity}`);
    return;
  }

  const { title, body } = messageConfig(alert.patientName);
  const channelId = alert.severity === "red" ? "sos" : "alerts";

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    sound: "default",
    priority: alert.severity === "red" ? "high" : "default",
    channelId,
    data: {
      screen: "caregiver",
      alertSeverity: alert.severity,
      patientName: alert.patientName,
    },
  }));

  // 5. Send
  logger.info(
    `Sending ${alert.severity.toUpperCase()} notifications to ${tokens.length} caregiver(s) for patient ${alert.patientName}`
  );
  await sendExpoPushNotifications(messages);
}

// ── Cloud Function: on alert created ───────────────────────────

/**
 * Triggered when a new alert document is created (GREEN).
 * Sends push notifications to all linked caregivers.
 */
export const onAlertCreated = onDocumentCreated(
  "alerts/{alertId}",
  async (event) => {
    const data = event.data?.data() as AlertData | undefined;
    if (!data) {
      logger.warn("onAlertCreated fired but no data found");
      return;
    }

    logger.info(
      `New ${data.severity.toUpperCase()} alert for patient ${data.patientName} (${data.patientUid})`
    );

    await notifyCaregivers(data);
  }
);

// ── Cloud Function: on alert updated (escalation) ─────────────

/**
 * Triggered when an alert document is updated.
 * If severity has escalated (green→yellow or yellow→red),
 * sends updated push notifications to caregivers.
 */
export const onAlertUpdated = onDocumentUpdated(
  "alerts/{alertId}",
  async (event) => {
    const before = event.data?.before.data() as AlertData | undefined;
    const after = event.data?.after.data() as AlertData | undefined;

    if (!before || !after) {
      logger.warn("onAlertUpdated fired but missing before/after data");
      return;
    }

    // Only notify on severity escalation
    const severityOrder = { green: 0, yellow: 1, red: 2 };
    const beforeLevel = severityOrder[before.severity] ?? -1;
    const afterLevel = severityOrder[after.severity] ?? -1;

    if (afterLevel <= beforeLevel) {
      // Not an escalation (could be cancellation or same level)
      return;
    }

    // Only notify if still active
    if (after.status !== "active") return;

    logger.info(
      `Alert escalated from ${before.severity.toUpperCase()} → ${after.severity.toUpperCase()} for patient ${after.patientName}`
    );

    await notifyCaregivers(after);
  }
);
