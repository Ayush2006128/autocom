import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Colors } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";

export default function CaregiverDashboard() {
  const { user, userDoc, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.greeting}>Hi, {user?.displayName ?? "Caregiver"} 👋</Text>
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Linked Patient Card */}
      <View style={styles.patientCard}>
        <Text style={styles.patientLabel}>Monitoring Patient</Text>
        <Text style={styles.patientCode}>{userDoc?.linkedPatientId ?? "------"}</Text>
        <Text style={styles.patientHint}>You'll receive alerts when they need help</Text>
      </View>

      {/* Alert Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>No Active Alerts</Text>
        <Text style={styles.statusHint}>
          Everything is OK. You'll be notified immediately if a fall is detected.
        </Text>
      </View>

      {/* Alert Legend */}
      <View style={styles.legendCard}>
        <Text style={styles.legendTitle}>Alert Levels</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: Colors.green }]} />
          <Text style={styles.legendText}>Check-in — "I think you should call them"</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: Colors.yellow }]} />
          <Text style={styles.legendText}>Urgent — "You should go back to them"</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: Colors.red }]} />
          <Text style={styles.legendText}>SOS — Emergency alarm with beeping</Text>
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
  patientCode: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.cyan,
    letterSpacing: 6,
    fontFamily: "monospace",
  },
  patientHint: {
    fontSize: 12,
    color: Colors.disabled,
    marginTop: 8,
  },
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
