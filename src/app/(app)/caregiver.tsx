import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Colors } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import {
  getPatientByCode,
  subscribeToAlerts,
  type AlertDocWithId,
} from "@/lib/firestore";

// ── Severity display helpers ───────────────────────────────────

const SEVERITY_COLORS = {
  green: { dot: Colors.green, bg: Colors.greenLight, text: Colors.green },
  yellow: { dot: Colors.yellow, bg: Colors.yellowLight, text: Colors.yellow },
  red: { dot: Colors.red, bg: Colors.redLight, text: Colors.red },
} as const;

const SEVERITY_LABELS: Record<string, string> = {
  green: "🟢 Check-in",
  yellow: "🟡 Urgent",
  red: "🔴 SOS",
};

function formatTimestamp(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts || !ts.toDate) return "Just now";
  const d = ts.toDate();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts || !ts.toDate) return "Today";
  const d = ts.toDate();
  const today = new Date();
  if (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  ) {
    return "Today";
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ── Component ──────────────────────────────────────────────────

export default function CaregiverDashboard() {
  const { user, userDoc, signOut } = useAuth();

  const [patientName, setPatientName] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertDocWithId[]>([]);
  const [loading, setLoading] = useState(true);

  // Look up patient UID from code, then subscribe to their alerts
  useEffect(() => {
    if (!userDoc?.linkedPatientId) return;

    let unsubAlerts: (() => void) | null = null;

    (async () => {
      const patient = await getPatientByCode(userDoc.linkedPatientId!);
      if (!patient) {
        setLoading(false);
        return;
      }

      setPatientName(patient.displayName);

      // Subscribe to real-time alert updates
      unsubAlerts = subscribeToAlerts(patient.uid, (updatedAlerts) => {
        setAlerts(updatedAlerts);
        setLoading(false);
      });
    })();

    return () => {
      unsubAlerts?.();
    };
  }, [userDoc?.linkedPatientId]);

  // Derived state
  const activeAlert = alerts.find((a) => a.status === "active") ?? null;
  const pastAlerts = alerts.filter((a) => a.status !== "active");

  // Active alert display config
  const activeColors = activeAlert
    ? SEVERITY_COLORS[activeAlert.severity]
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.greeting}>
          Hi, {user?.displayName ?? "Caregiver"} 👋
        </Text>
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Linked Patient Card */}
      <View style={styles.patientCard}>
        <Text style={styles.patientLabel}>Monitoring Patient</Text>
        <Text style={styles.patientName}>
          {patientName ?? userDoc?.linkedPatientId ?? "------"}
        </Text>
        <Text style={styles.patientCode}>
          Code: {userDoc?.linkedPatientId ?? "------"}
        </Text>
      </View>

      {/* Active Alert or All Clear */}
      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={Colors.teal} />
          <Text style={styles.loadingText}>Connecting…</Text>
        </View>
      ) : activeAlert && activeColors ? (
        <View
          style={[styles.alertCard, { backgroundColor: activeColors.bg }]}
        >
          <View
            style={[styles.alertDot, { backgroundColor: activeColors.dot }]}
          />
          <Text style={[styles.alertSeverity, { color: activeColors.text }]}>
            {SEVERITY_LABELS[activeAlert.severity] ?? activeAlert.severity}
          </Text>
          <Text style={styles.alertPatientName}>
            {activeAlert.patientName} needs help
          </Text>
          <Text style={styles.alertTime}>
            {formatTimestamp(activeAlert.createdAt)}
          </Text>
        </View>
      ) : (
        <View style={styles.statusCard}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>No Active Alerts</Text>
          <Text style={styles.statusHint}>
            Everything is OK. You'll be notified immediately if a fall is
            detected.
          </Text>
        </View>
      )}

      {/* Alert History */}
      {pastAlerts.length > 0 && (
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Alert History</Text>
          <FlatList
            data={pastAlerts}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const colors = SEVERITY_COLORS[item.severity];
              return (
                <View style={styles.historyRow}>
                  <View
                    style={[
                      styles.historyDot,
                      { backgroundColor: colors.dot },
                    ]}
                  />
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyLabel}>
                      {SEVERITY_LABELS[item.severity] ?? item.severity}
                    </Text>
                    <Text style={styles.historyMeta}>
                      {formatDate(item.createdAt)} at{" "}
                      {formatTimestamp(item.createdAt)} ·{" "}
                      {item.status === "cancelled" ? "Cancelled" : "Resolved"}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* Alert Legend */}
      <View style={styles.legendCard}>
        <Text style={styles.legendTitle}>Alert Levels</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: Colors.green }]} />
          <Text style={styles.legendText}>
            Check-in — "I think you should call them"
          </Text>
        </View>
        <View style={styles.legendRow}>
          <View
            style={[styles.legendDot, { backgroundColor: Colors.yellow }]}
          />
          <Text style={styles.legendText}>
            Urgent — "You should go back to them"
          </Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: Colors.red }]} />
          <Text style={styles.legendText}>
            SOS — Emergency alarm with beeping
          </Text>
        </View>
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
  patientCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.cyan,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  patientLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  patientName: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  patientCode: {
    fontSize: 13,
    color: Colors.disabled,
    marginTop: 4,
    fontFamily: "monospace",
  },
  // Loading state
  loadingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  // Active alert
  alertCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  alertDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginBottom: 8,
  },
  alertSeverity: {
    fontSize: 22,
    fontWeight: "800",
  },
  alertPatientName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginTop: 4,
  },
  alertTime: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  // All clear
  statusCard: {
    backgroundColor: Colors.greenLight,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.green,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.green,
  },
  statusHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 18,
  },
  // Alert history
  historyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  historyMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Alert legend
  legendCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  legendText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
});
