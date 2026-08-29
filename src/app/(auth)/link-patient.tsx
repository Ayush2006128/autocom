import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { linkCaregiverToPatient } from "@/lib/firestore";

export default function LinkPatientScreen() {
  const { user, refreshUserDoc } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleLink = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError("Patient code must be exactly 6 characters");
      return;
    }
    if (!user) return;

    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const result = await linkCaregiverToPatient(user.uid, trimmed);
      if (result.success) {
        setSuccess(`Linked to ${result.patientName}!`);
        await refreshUserDoc();
        // Short delay to show success, then navigate
        setTimeout(() => {
          router.replace("/(app)/caregiver");
        }, 1500);
      } else {
        setError(result.error ?? "Failed to link");
      }
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>AutoCom</Text>
        <Text style={styles.subtitle}>Link to a Patient</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.description}>
          Enter the 6-character code from your patient's app to start receiving their alerts.
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase().slice(0, 6))}
          placeholder="ABC123"
          placeholderTextColor={Colors.disabled}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          editable={!loading && !success}
        />

        <TouchableOpacity
          style={[styles.button, (loading || !!success) && styles.buttonDisabled]}
          onPress={handleLink}
          disabled={loading || !!success}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={Colors.textOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>Link Patient</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  appName: {
    fontSize: 36,
    fontWeight: "800",
    color: Colors.teal,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginTop: 8,
    fontWeight: "500",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: "center",
  },
  errorBox: {
    backgroundColor: Colors.redLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.red,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  successBox: {
    backgroundColor: Colors.greenLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: Colors.green,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  codeInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  button: {
    backgroundColor: Colors.teal,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.textOnPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
