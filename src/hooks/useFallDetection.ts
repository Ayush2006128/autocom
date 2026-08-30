import { useEffect, useRef, useState, useCallback } from "react";
import { useAccelerometer, useGyroscope } from "@/hooks/sensors";
import { detectFall } from "@/lib/fall-detector";

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
  /** Called when the patient cancels the alert */
  onCancel: (alertId: string) => Promise<void>;
}

/**
 * Hook that wires `detectFall()` into the patient dashboard.
 *
 * - Subscribes to accelerometer + gyroscope via existing hooks
 * - Calls `detectFall()` on each sensor update
 * - Tracks how long `detectFall()` has returned `true` consecutively
 * - After 1 second of sustained `true` → triggers GREEN
 */
export function useFallDetection({ onGreenTrigger, onCancel }: UseFallDetectionOptions) {
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

  /** Patient pressed "I'm OK" — cancel the active alert */
  const cancelAlert = useCallback(async () => {
    const alertId = stateRef.current.activeAlertId;
    if (!alertId) return;

    await onCancel(alertId);

    // Reset everything
    setState({ severity: "safe", detecting: false, activeAlertId: null });
    sustainedSinceRef.current = null;
    greenTriggeredRef.current = false;
  }, [onCancel]);

  return {
    severity: state.severity,
    detecting: state.detecting,
    activeAlertId: state.activeAlertId,
    cancelAlert,
  };
}
