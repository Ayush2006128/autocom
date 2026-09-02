import { useEffect, useRef } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { saveExpoPushToken, cancelAlert } from "@/lib/firestore";
import {
  registerForPushNotificationsAsync,
  setupNotificationCategories,
  IM_OK_ACTION_ID,
} from "@/lib/notifications";
import { Colors } from "@/lib/theme";

// ── Push token registration hook ───────────────────────────────

/**
 * Registers the Expo push token on every app launch (tokens can change),
 * saves it to the user's Firestore document, sets up notification categories,
 * and handles notification response listeners (including "I'm OK" action).
 */
function usePushNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Register token and notification categories whenever user changes (login/logout)
  useEffect(() => {
    if (!user) return;

    // Register push token
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        saveExpoPushToken(user.uid, token).catch((err) =>
          console.error("[AutoCom] Failed to save push token:", err)
        );
      }
    });

    // Set up notification categories (for "I'm OK" action button)
    setupNotificationCategories().catch((err) =>
      console.error("[AutoCom] Failed to set up notification categories:", err)
    );
  }, [user?.uid]);

  // Listen for notification taps and action button presses
  useEffect(() => {
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const { actionIdentifier } = response;
        const data = response.notification.request.content.data;

        // Handle "I'm OK" action button from notification
        if (actionIdentifier === IM_OK_ACTION_ID) {
          const alertId = data?.alertId as string | undefined;
          if (alertId) {
            cancelAlert(alertId).catch((err) =>
              console.error(
                "[AutoCom] Failed to cancel alert from notification:",
                err
              )
            );
            // Dismiss all displayed notifications
            Notifications.dismissAllNotificationsAsync().catch((err) =>
              console.error(
                "[AutoCom] Failed to dismiss notifications:",
                err
              )
            );
          }
          return;
        }

        // Handle normal notification tap — navigate to the appropriate dashboard
        if (data?.screen === "caregiver") {
          router.push("/(app)/caregiver");
        } else if (data?.screen === "patient") {
          router.push("/(app)/patient");
        }
      });

    return () => {
      responseListener.current?.remove();
    };
  }, []);
}

// ── Auth guard ─────────────────────────────────────────────────

/** Auth guard — redirects based on auth state + user role */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userDoc, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Register for push notifications
  usePushNotifications();

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
        <StatusBar style="dark" />
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
