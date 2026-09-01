"use strict";
/**
 * AutoCom — Firebase Cloud Functions
 *
 * Triggers on `alerts` collection writes and sends Expo push notifications
 * to all caregivers linked to the patient.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAlertUpdated = exports.onAlertCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const firebase_functions_1 = require("firebase-functions");
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
// ── Notification messages by severity ──────────────────────────
const SEVERITY_MESSAGES = {
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
/**
 * Send push notifications via the Expo Push API.
 * Batches up to 100 messages per request (Expo limit).
 */
async function sendExpoPushNotifications(messages) {
    if (messages.length === 0)
        return;
    // Batch into chunks of 100
    const chunks = [];
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
                firebase_functions_1.logger.error("Expo Push API errors:", result.errors);
            }
            // Log individual ticket statuses
            if (result.data) {
                for (let i = 0; i < result.data.length; i++) {
                    const ticket = result.data[i];
                    if (ticket.status === "error") {
                        firebase_functions_1.logger.error(`Push ticket error for token ${chunk[i].to}:`, ticket.message, ticket.details);
                    }
                }
            }
        }
        catch (error) {
            firebase_functions_1.logger.error("Failed to send Expo push notifications:", error);
        }
    }
}
// ── Helper: find caregivers & send notifications ───────────────
/**
 * Given a patient UID and alert data, find all linked caregivers
 * and send them push notifications.
 */
async function notifyCaregivers(alert) {
    // 1. Get the patient's patientId (6-char code)
    const patientSnap = await db.collection("users").doc(alert.patientUid).get();
    if (!patientSnap.exists) {
        firebase_functions_1.logger.warn(`Patient doc not found for UID: ${alert.patientUid}`);
        return;
    }
    const patientData = patientSnap.data();
    const patientCode = patientData.patientId;
    if (!patientCode) {
        firebase_functions_1.logger.warn(`Patient ${alert.patientUid} has no patientId code`);
        return;
    }
    // 2. Find all caregivers linked to this patient
    const caregiversSnap = await db
        .collection("users")
        .where("role", "==", "caregiver")
        .where("linkedPatientId", "==", patientCode)
        .get();
    if (caregiversSnap.empty) {
        firebase_functions_1.logger.info(`No caregivers linked to patient ${patientCode}`);
        return;
    }
    // 3. Collect push tokens
    const tokens = [];
    caregiversSnap.forEach((doc) => {
        const data = doc.data();
        if (data.expoPushToken) {
            tokens.push(data.expoPushToken);
        }
    });
    if (tokens.length === 0) {
        firebase_functions_1.logger.info(`Caregivers found for patient ${patientCode}, but none have push tokens`);
        return;
    }
    // 4. Build notification messages
    const messageConfig = SEVERITY_MESSAGES[alert.severity];
    if (!messageConfig) {
        firebase_functions_1.logger.warn(`Unknown severity: ${alert.severity}`);
        return;
    }
    const { title, body } = messageConfig(alert.patientName);
    const channelId = alert.severity === "red" ? "sos" : "alerts";
    const messages = tokens.map((token) => ({
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
    firebase_functions_1.logger.info(`Sending ${alert.severity.toUpperCase()} notifications to ${tokens.length} caregiver(s) for patient ${alert.patientName}`);
    await sendExpoPushNotifications(messages);
}
// ── Cloud Function: on alert created ───────────────────────────
/**
 * Triggered when a new alert document is created (GREEN).
 * Sends push notifications to all linked caregivers.
 */
exports.onAlertCreated = (0, firestore_1.onDocumentCreated)("alerts/{alertId}", async (event) => {
    const data = event.data?.data();
    if (!data) {
        firebase_functions_1.logger.warn("onAlertCreated fired but no data found");
        return;
    }
    firebase_functions_1.logger.info(`New ${data.severity.toUpperCase()} alert for patient ${data.patientName} (${data.patientUid})`);
    await notifyCaregivers(data);
});
// ── Cloud Function: on alert updated (escalation) ─────────────
/**
 * Triggered when an alert document is updated.
 * If severity has escalated (green→yellow or yellow→red),
 * sends updated push notifications to caregivers.
 */
exports.onAlertUpdated = (0, firestore_1.onDocumentUpdated)("alerts/{alertId}", async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
        firebase_functions_1.logger.warn("onAlertUpdated fired but missing before/after data");
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
    if (after.status !== "active")
        return;
    firebase_functions_1.logger.info(`Alert escalated from ${before.severity.toUpperCase()} → ${after.severity.toUpperCase()} for patient ${after.patientName}`);
    await notifyCaregivers(after);
});
//# sourceMappingURL=index.js.map