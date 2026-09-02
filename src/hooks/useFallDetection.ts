import { useEffect, useRef, useState, useCallback } from "react";
import { useAccelerometer, useGyroscope } from "@/hooks/sensors";
import { detectFall } from "@/lib/fall-detector";
import {
  sendPatientAlertNotification,
  dismissAllNotifications,
} from "@/lib/notifications";

export type AlertSeverity = "safe" | "green" | "yellow" | "red";

interface FallDetectionState {
  /** Current alert severity level */
  severity: AlertSeverity;
  /** Whether the fall detection algorithm is currently firing */
  detecting: boolean;
  /** Firestore alert document ID (set once GREEN triggers) */
  activeAlertId: string | null;
}

interface UseFallDetectionOptions {
  /** Called when severity escalates to GREEN. Should write alert to Firestore and return the doc ID. */
  onGreenTrigger: () => Promise<string>;
  /** Called when severity escalates to YELLOW or RED. Should update the alert doc in Firestore. */
  onEscalate: (alertId: string, severity: "yellow" | "red") => Promise<void>;
  /** Called when the patient cancels the alert */
  onCancel: (alertId: string) => Promise<void>;
}

// ── Escalation timing constants ────────────────────────────────
const GREEN_TO_YELLOW_MS = 5_000; // 5 seconds after GREEN → YELLOW
const YELLOW_TO_RED_MS = 10_000; // 10 seconds after YELLOW → RED

/**
 * Hook that wires `detectFall()` into the patient dashboard with
 * full escalation engine:
 *
 * - Subscribes to accelerometer + gyroscope via existing hooks
 * - Calls `detectFall()` on each sensor update
 * - Tracks how long `detectFall()` has returned `true` consecutively
 * - After 1 second of sustained `true` → triggers GREEN
 * - 5 seconds after GREEN (if not cancelled) → YELLOW
 * - 10 seconds after YELLOW (if not cancelled) → RED
 * - Sends local notifications at each escalation level with "I'm OK" action
 * - Cancels escalation if patient presses "I'm OK" (in-app or via notification)
 */
export function useFallDetection({
  onGreenTrigger,
  onEscalate,
  onCancel,
}: UseFallDetectionOptions) {
  const accelData = useAccelerometer();
  const gyroData = useGyroscope();

  const [state, setState] = useState<FallDetectionState>({
    severity: "safe",
    detecting: false,
    activeAlertId: null,
  });

  // Track when sustained detection started (null = not currently detecting)
  const sustainedSinceRef = useRef<number | null>(null);
  // Prevent duplicate GREEN triggers
  const greenTriggeredRef = useRef(false);
  // Store the latest state for use in callbacks without stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  // Escalation timer refs
  const yellowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cleanup helper ─────────────────────────────────────────

  /** Clear all escalation timers */
  const clearEscalationTimers = useCallback(() => {
    if (yellowTimerRef.current) {
      clearTimeout(yellowTimerRef.current);
      yellowTimerRef.current = null;
    }
    if (redTimerRef.current) {
      clearTimeout(redTimerRef.current);
      redTimerRef.current = null;
    }
  }, []);

  // ── Escalation engine ──────────────────────────────────────

  /**
   * Start the GREEN → YELLOW timer.
   * Called immediately after GREEN triggers.
   */
  const startYellowTimer = useCallback(
    (alertId: string) => {
      yellowTimerRef.current = setTimeout(async () => {
        yellowTimerRef.current = null;

        // Don't escalate if already cancelled
        if (stateRef.current.severity !== "green") return;

        // Escalate to YELLOW
        try {
          await onEscalate(alertId, "yellow");
        } catch (err) {
          console.error("[AutoCom] Failed to escalate to YELLOW:", err);
        }

        setState((prev) => ({ ...prev, severity: "yellow" }));

        // Send local notification to patient
        sendPatientAlertNotification("yellow", alertId).catch((err) =>
          console.error("[AutoCom] Failed to send YELLOW notification:", err)
        );

        // Start the YELLOW → RED timer
        startRedTimer(alertId);
      }, GREEN_TO_YELLOW_MS);
    },
    [onEscalate]
  );

  /**
   * Start the YELLOW → RED timer.
   * Called immediately after YELLOW triggers.
   */
  const startRedTimer = useCallback(
    (alertId: string) => {
      redTimerRef.current = setTimeout(async () => {
        redTimerRef.current = null;

        // Don't escalate if already cancelled
        if (stateRef.current.severity !== "yellow") return;

        // Escalate to RED
        try {
          await onEscalate(alertId, "red");
        } catch (err) {
          console.error("[AutoCom] Failed to escalate to RED:", err);
        }

        setState((prev) => ({ ...prev, severity: "red" }));

        // Send local notification to patient
        sendPatientAlertNotification("red", alertId).catch((err) =>
          console.error("[AutoCom] Failed to send RED notification:", err)
        );
      }, YELLOW_TO_RED_MS);
    },
    [onEscalate]
  );

  // ── Sensor processing ──────────────────────────────────────

  // Process sensor data on each update
  useEffect(() => {
    // Don't run detection if an alert is already active
    if (stateRef.current.severity !== "safe") return;

    const now = Date.now();
    const isFalling = detectFall(accelData, gyroData, now);

    if (isFalling) {
      if (sustainedSinceRef.current === null) {
        // First frame of detection — start the clock
        sustainedSinceRef.current = now;
        setState((prev) => ({ ...prev, detecting: true }));
      } else {
        // Check if we've been detecting for ≥ 1 second
        const elapsed = now - sustainedSinceRef.current;
        if (elapsed >= 1000 && !greenTriggeredRef.current) {
          greenTriggeredRef.current = true;
          // Trigger GREEN
          onGreenTrigger().then((alertId) => {
            setState({
              severity: "green",
              detecting: false,
              activeAlertId: alertId,
            });

            // Send local notification to patient with "I'm OK" button
            sendPatientAlertNotification("green", alertId).catch((err) =>
              console.error(
                "[AutoCom] Failed to send GREEN notification:",
                err
              )
            );

            // Start escalation: GREEN → YELLOW after 5 seconds
            startYellowTimer(alertId);
          });
        }
      }
    } else {
      // Fall detection stopped — reset sustained timer
      if (sustainedSinceRef.current !== null) {
        sustainedSinceRef.current = null;
        setState((prev) => ({ ...prev, detecting: false }));
      }
    }
  }, [accelData, gyroData]);

  // ── Cancel handler ─────────────────────────────────────────

  /** Patient pressed "I'm OK" — cancel the active alert and stop escalation */
  const cancelAlert = useCallback(async () => {
    const alertId = stateRef.current.activeAlertId;
    if (!alertId) return;

    // Stop all escalation timers immediately
    clearEscalationTimers();

    // Cancel in Firestore
    await onCancel(alertId);

    // Dismiss any displayed notifications
    dismissAllNotifications().catch((err) =>
      console.error("[AutoCom] Failed to dismiss notifications:", err)
    );

    // Reset everything
    setState({ severity: "safe", detecting: false, activeAlertId: null });
    sustainedSinceRef.current = null;
    greenTriggeredRef.current = false;
  }, [onCancel, clearEscalationTimers]);

  // ── Cleanup on unmount ─────────────────────────────────────

  useEffect(() => {
    return () => {
      clearEscalationTimers();
    };
  }, [clearEscalationTimers]);

  return {
    severity: state.severity,
    detecting: state.detecting,
    activeAlertId: state.activeAlertId,
    cancelAlert,
  };
}
