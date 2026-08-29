import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Colors } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";

export default function PatientDashboard() {
  const { user, userDoc, signOut } = useAuth();

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
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Patient Code Card */}
      <TouchableOpacity style={styles.codeCard} onPress={handleCopyCode} activeOpacity={0.8}>
        <Text style={styles.codeLabel}>Your Patient Code</Text>
        <Text style={styles.codeValue}>{userDoc?.patientId ?? "------"}</Text>
        <Text style={styles.codeHint}>Tap to share with caregivers</Text>
      </TouchableOpacity>

      {/* Status Indicator */}
      <View style={styles.statusCard}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>All Clear</Text>
        <Text style={styles.statusHint}>
          Fall detection is active. Your caregivers will be notified if you need help.
        </Text>
      </View>

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
