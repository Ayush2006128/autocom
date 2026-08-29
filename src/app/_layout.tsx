import { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Colors } from "@/lib/theme";

/** Auth guard — redirects based on auth state + user role */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userDoc, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user) {
      // Not logged in → send to login
      if (!inAuthGroup) {
        router.replace("/(auth)/login");
      }
    } else if (!userDoc) {
      // Logged in but no Firestore doc → needs role selection
      router.replace("/(auth)/role-select");
    } else if (userDoc.role === "caregiver" && !userDoc.linkedPatientId) {
      // Caregiver without linked patient → needs to link
      router.replace("/(auth)/link-patient");
    } else if (inAuthGroup) {
      // Has a complete profile, get out of auth group
      if (userDoc.role === "patient") {
        router.replace("/(app)/patient");
      } else {
        router.replace("/(app)/caregiver");
      }
    }
  }, [user, userDoc, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.teal} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGuard>
        <Slot />
      </AuthGuard>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
});
