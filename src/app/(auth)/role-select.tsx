import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";

export default function RoleSelectScreen() {
  const { setRole } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<"patient" | "caregiver" | null>(null);
  const [error, setError] = useState("");

  const handleSelect = async (role: "patient" | "caregiver") => {
    setError("");
    setLoading(role);
    try {
      if (role === "patient") {
        await setRole("patient");
        // Auth listener will pick up the new userDoc and redirect
        router.replace("/(app)/patient");
      } else {
        await setRole("caregiver");
        // Caregiver needs to link to a patient first
        router.replace("/(auth)/link-patient");
      }
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>AutoCom</Text>
        <Text style={styles.subtitle}>Who are you?</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.card, loading === "patient" && styles.cardActive]}
        onPress={() => handleSelect("patient")}
        disabled={loading !== null}
        activeOpacity={0.85}
      >
        <Text style={styles.emoji}>🧑‍🦽</Text>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>I'm a Patient</Text>
          <Text style={styles.cardDescription}>
            I need help communicating with my caregivers when my phone falls
          </Text>
        </View>
        {loading === "patient" && (
          <ActivityIndicator color={Colors.teal} style={styles.loader} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, loading === "caregiver" && styles.cardActive]}
        onPress={() => handleSelect("caregiver")}
        disabled={loading !== null}
        activeOpacity={0.85}
      >
        <Text style={styles.emoji}>🛡️</Text>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>I'm a Caregiver</Text>
          <Text style={styles.cardDescription}>
            I want to receive alerts when someone I care for needs help
          </Text>
        </View>
        {loading === "caregiver" && (
          <ActivityIndicator color={Colors.teal} style={styles.loader} />
        )}
      </TouchableOpacity>
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
    marginBottom: 40,
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardActive: {
    borderColor: Colors.teal,
    backgroundColor: Colors.surfacePressed,
  },
  emoji: {
    fontSize: 40,
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  loader: {
    marginLeft: 8,
  },
});
