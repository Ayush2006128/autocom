import { Redirect } from "expo-router";

/**
 * Root index — immediately redirects to the auth flow.
 * The AuthGuard in _layout.tsx will then route to the correct screen
 * based on auth state (login, role-select, patient, or caregiver dashboard).
 */
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
