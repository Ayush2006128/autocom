import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Colors } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { useFallDetection, type AlertSeverity } from "@/hooks/useFallDetection";
import { createAlert, cancelAlert, escalateAlert } from "@/lib/firestore";
import {
  isForegroundMonitoringRunning,
  startForegroundMonitoring,
  stopForegroundMonitoring,
} from "@/lib/foreground-service";

// ── Severity display config ────────────────────────────────────

const SEVERITY_CONFIG: Record<AlertSeverity, {
  label: string;
  hint: string;
  dotColor: string;
  cardBg: string;
  textColor: string;
}> = {
  safe: {
    label: "All Clear",
    hint: "Fall detection is active. Your caregivers will be notified if you need help.",
    dotColor: Colors.green,
    cardBg: Colors.greenLight,
    textColor: Colors.green,
  },
  green: {
    label: "🟢 Fall Detected",
    hint: "Your caregivers have been notified. Tap \"I'm OK\" if you're fine.",
    dotColor: Colors.green,
    cardBg: Colors.greenLight,
    textColor: Colors.green,
  },
  yellow: {
    label: "🟡 Are You OK?",
    hint: "Your caregivers have been asked to check on you. Tap \"I'm OK\" to cancel.",
    dotColor: Colors.yellow,
    cardBg: Colors.yellowLight,
    textColor: Colors.yellow,
  },
  red: {
    label: "🔴 SOS Active",
    hint: "Emergency alert sent. Your caregivers are being alerted with SOS.",
    dotColor: Colors.red,
    cardBg: Colors.redLight,
    textColor: Colors.red,
  },
};

export default function PatientDashboard() {
  const { user, userDoc, signOut } = useAuth();
  const [monitoring, setMonitoring] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(true);

  useEffect(() => {
    isForegroundMonitoringRunning()
      .then(setMonitoring)
      .finally(() => setServiceLoading(false));
  }, []);

  const toggleMonitoring = async () => {
    setServiceLoading(true);
    try {
      if (monitoring) {
        await stopForegroundMonitoring();
        setMonitoring(false);
      } else {
        await startForegroundMonitoring();
        setMonitoring(true);
      }
    } finally {
      setServiceLoading(false);
    }
  };

  const handleSignOut = async () => {
    await stopForegroundMonitoring();
    await signOut();
  };

  const handleGreenTrigger = useCallback(async () => {
    const alertId = await createAlert(
      user?.uid ?? "",
      user?.displayName ?? userDoc?.displayName ?? "Patient"
    );
    return alertId;
  }, [user, userDoc]);

  const handleEscalate = useCallback(
    async (alertId: string, severity: "yellow" | "red") => {
      await escalateAlert(alertId, severity);
    },
    []
  );

  const handleCancel = useCallback(async (alertId: string) => {
    await cancelAlert(alertId);
  }, []);

  const { severity, detecting, cancelAlert: dismissAlert } = useFallDetection({
    onGreenTrigger: handleGreenTrigger,
    onEscalate: handleEscalate,
    onCancel: handleCancel,
    enabled: monitoring,
  });

  const config = SEVERITY_CONFIG[severity];
  const isAlertActive = severity !== "safe";

  const handleCopyCode = () => {
    if (userDoc?.patientId) {
      Alert.alert(
        "Your Patient Code",
        `Share this code with your caregivers:\n\n${userDoc.patientId}`,
        [{ text: "OK" }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.greeting}>Hi, {user?.displayName ?? "Patient"} 👋</Text>
        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.signOutBtn}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Patient Code Card */}
      <TouchableOpacity style={styles.codeCard} onPress={handleCopyCode} activeOpacity={0.8}>
        <Text style={styles.codeLabel}>Your Patient Code</Text>
        <Text style={styles.codeValue}>{userDoc?.patientId ?? "------"}</Text>
        <Text style={styles.codeHint}>Tap to share with caregivers</Text>
      </TouchableOpacity>

      <View
        style={styles.monitorStatus}
        accessibilityLabel={
          monitoring
            ? "Background monitoring is active"
            : "Background monitoring is stopped"
        }
      >
        <View
          style={[
            styles.monitorStatusDot,
            { backgroundColor: monitoring ? Colors.green : Colors.disabled },
          ]}
        />
        <Text style={styles.monitorStatusText}>
          {monitoring ? "Background monitoring active" : "Monitoring stopped"}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.monitorBtn, monitoring ? styles.stopBtn : styles.startBtn]}
        onPress={toggleMonitoring}
        disabled={serviceLoading}
        accessibilityRole="button"
        accessibilityLabel={monitoring ? "Stop monitoring" : "Start monitoring"}
        accessibilityState={{ disabled: serviceLoading }}
      >
        <Text style={styles.monitorBtnText}>
          {serviceLoading ? "Updating…" : monitoring ? "Stop Monitoring" : "Start Monitoring"}
        </Text>
      </TouchableOpacity>

      {/* Status Indicator — changes color based on severity */}
      <View style={[styles.statusCard, { backgroundColor: config.cardBg }]}>
        <View style={[styles.statusDot, { backgroundColor: config.dotColor }]} />
        <Text style={[styles.statusText, { color: config.textColor }]}>
          {detecting ? "⚠️ Detecting fall…" : config.label}
        </Text>
        <Text style={styles.statusHint}>{config.hint}</Text>
      </View>

      {/* "I'm OK" cancel button — shown only when alert is active */}
      {isAlertActive && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={dismissAlert}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelBtnText}>I'm OK 👍</Text>
        </TouchableOpacity>
      )}

      {/* How it works */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoText}>
          📱 If your phone detects a fall, it will automatically alert your caregivers in 3 stages:
        </Text>
        <Text style={styles.infoStep}>🟢 After 1 second — gentle check-in notification</Text>
        <Text style={styles.infoStep}>🟡 After 5 more seconds — urgent go-back notification</Text>
        <Text style={styles.infoStep}>🔴 After 10 more seconds — SOS alarm with beeping</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  signOutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfacePressed,
  },
  signOutText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  codeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.teal,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  codeValue: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.teal,
    letterSpacing: 6,
    fontFamily: "monospace",
  },
  codeHint: {
    fontSize: 12,
    color: Colors.disabled,
    marginTop: 8,
  },
  statusCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 20,
    fontWeight: "700",
  },
  statusHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 18,
  },
  cancelBtn: {
    backgroundColor: Colors.teal,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelBtnText: {
    color: Colors.textOnPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  monitorBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  startBtn: { backgroundColor: Colors.teal },
  stopBtn: { backgroundColor: Colors.red },
  monitorBtnText: {
    color: Colors.textOnPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  monitorStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  monitorStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  monitorStatusText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  infoStep: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 4,
  },
});
