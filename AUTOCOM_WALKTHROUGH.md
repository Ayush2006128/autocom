# AutoCom — Walkthrough & Next Steps

> **Last updated:** 2026-08-30 | **Branch:** `main`
>
> Reference this file when continuing development with an AI assistant.

---

## What is AutoCom?

An automatic communicator for physically impaired users (SMA, etc.). When a patient's phone detects a fall via accelerometer + gyroscope, it escalates alerts to their caregivers through 3 severity levels:

| Level | Trigger | Caregiver Message |
|-------|---------|-------------------|
| 🟢 GREEN | Fall detected for >1s | "I think you should call {patient}" |
| 🟡 YELLOW | 5s after GREEN, patient didn't cancel | "Sir/Ma'am You should go back to {patient}" |
| 🔴 RED | 10s after YELLOW, patient didn't cancel | SOS Morse code beep + vibration on CG phone |

---

## Tech Stack

- **Framework:** Expo SDK 57, React Native 0.86, React 19.2
- **Routing:** expo-router (file-based, typed routes)
- **Auth:** Firebase Auth (JS SDK) with AsyncStorage persistence
- **Database:** Cloud Firestore
- **Notifications:** expo-notifications + EAS Push
- **Sensors:** expo-sensors (accelerometer + gyroscope)
- **Target:** Android-first (EAS Build)

---

## Project Structure

```
autocom/
├── src/
│   ├── app/                        # expo-router file-based routes
│   │   ├── _layout.tsx             # Root layout: AuthProvider + AuthGuard
│   │   ├── index.tsx               # Redirects to /(auth)/login
│   │   ├── (auth)/                 # Unauthenticated screens
│   │   │   ├── _layout.tsx         # Stack layout, no header
│   │   │   ├── login.tsx           # Email/password sign in
│   │   │   ├── register.tsx        # Name/email/password sign up → role-select
│   │   │   ├── role-select.tsx     # "I'm a Patient" / "I'm a Caregiver"
│   │   │   └── link-patient.tsx    # Caregiver enters 6-char patient code
│   │   └── (app)/                  # Authenticated screens
│   │       ├── _layout.tsx         # Stack layout, no header
│   │       ├── patient.tsx         # Patient dashboard (code card, status)
│   │       └── caregiver.tsx       # Caregiver dashboard (linked patient, legend)
│   ├── lib/
│   │   ├── theme.ts                # Color palette (teal/cyan/mint + alert colors)
│   │   ├── auth-context.tsx        # AuthProvider, useAuth() hook
│   │   ├── firestore.ts           # User CRUD, patient ID gen, CG linking, alert CRUD
│   │   └── fall-detector.ts        # detectFall() — accel + gyro algorithm
│   ├── hooks/
│   │   ├── sensors.ts              # useAccelerometer(), useGyroscope() hooks
│   │   └── useFallDetection.ts     # useFallDetection() — wires sensors → detectFall → GREEN alert
│   └── firebaseConfig.ts          # Firebase init with AsyncStorage persistence
├── assets/images/                  # App icons, splash
├── app.json                        # Expo config (scheme: autocom)
├── eas.json                        # EAS Build config
├── package.json                    # Dependencies
└── tsconfig.json                   # TS strict, path aliases @/* → ./src/*
```

---

## How the Auth Flow Works

```
App opens
  └→ _layout.tsx AuthGuard checks auth state
       ├── No user → /(auth)/login
       ├── User but no Firestore doc → /(auth)/role-select
       ├── Caregiver without linkedPatientId → /(auth)/link-patient
       ├── Patient with complete profile → /(app)/patient
       └── Caregiver with complete profile → /(app)/caregiver
```

### Key files:
- **`src/app/_layout.tsx`** — `AuthProvider` wraps everything; `AuthGuard` uses `useSegments()` to detect current route group and `router.replace()` to redirect.
- **`src/lib/auth-context.tsx`** — Exposes `useAuth()` with: `user`, `userDoc`, `loading`, `signIn()`, `register()`, `signOut()`, `setRole()`, `refreshUserDoc()`.
- **`src/firebaseConfig.ts`** — Uses `initializeAuth` + `getReactNativePersistence(AsyncStorage)` so login persists across Android app restarts. Guarded against Fast Refresh duplicate init.

---

## Firestore Data Model

### `users/{uid}`
```ts
{
  email: string;
  displayName: string;
  role: "patient" | "caregiver";
  patientId?: string;         // 6-char code (patients only), charset: A-Z sans I/O + 2-9
  linkedPatientId?: string;   // caregivers: the patientId they monitor
  expoPushToken?: string;     // for push notifications (not yet implemented)
  createdAt: Timestamp;
}
```

### `alerts/{alertId}` (not yet implemented)
```ts
{
  patientUid: string;
  patientName: string;
  severity: "green" | "yellow" | "red";
  status: "active" | "cancelled" | "resolved";
  createdAt: Timestamp;
  escalatedToYellowAt?: Timestamp;
  escalatedToRedAt?: Timestamp;
  cancelledAt?: Timestamp;
}
```

---

## Fall Detection Algorithm

**File:** `src/lib/fall-detector.ts`

`detectFall(accelData, gyroData, timestampMs) → boolean`

Returns `true` when BOTH conditions are met:
1. **Angular velocity magnitude > 1 rad/s** (phone rotating fast)
2. **G-force change > 0.1g over 1 second** (sudden acceleration change)

Maintains a rolling 1.5s history buffer, pruned on each call.

---

## Color Palette

Extracted from the app icon (teal-to-mint gradient):

| Token | Hex | Usage |
|-------|-----|-------|
| `teal` | `#4BBEB0` | Primary buttons, headers, brand |
| `cyan` | `#5BBDD6` | Accent, links, caregiver card border |
| `mint` | `#7DCDB5` | Success states |
| `background` | `#F0FAF8` | Screen background |
| `surface` | `#FFFFFF` | Cards |
| `textPrimary` | `#1A3C3A` | Body text |
| `textSecondary` | `#5E8A87` | Subtle text |
| `green` | `#34C759` | GREEN alert |
| `yellow` | `#FFB800` | YELLOW alert |
| `red` | `#FF3B30` | RED alert / SOS |

---

## What's Done ✅

### Step 1 — Auth + User Model + Role Selection
- [x] Firebase Auth email/password (sign in, register, sign out)
- [x] AsyncStorage persistence (survives app restart)
- [x] Firestore user document with role
- [x] Patient ID generation (6-char, collision-checked)
- [x] Caregiver linking by patient code
- [x] Auth guard with conditional routing
- [x] Theme constants
- [x] Patient dashboard (code card, status, how-it-works)
- [x] Caregiver dashboard (linked patient, alert legend)
- [x] 0 TypeScript errors

### Step 2 — Patient Dashboard + Fall Monitoring
- [x] Created `useFallDetection()` hook (`src/hooks/useFallDetection.ts`) that:
  - Subscribes to accelerometer + gyroscope via existing `useAccelerometer()` / `useGyroscope()`
  - Calls `detectFall()` on each sensor update
  - Tracks how long `detectFall()` has returned `true` consecutively
  - After 1 second of sustained `true` → triggers GREEN
- [x] Updated `patient.tsx` to show alert state (safe / green / yellow / red) with dynamic colors
- [x] "I'm OK" cancel button appears when alert is active
- [x] Writes alert doc to Firestore `alerts/` collection on GREEN trigger (`createAlert()` in `firestore.ts`)
- [x] Added `cancelAlert()` to Firestore — marks alert as `cancelled` with timestamp
- [x] Status card color changes based on current severity (green → yellow → red)
- [x] 0 TypeScript errors

### Step 3 — Caregiver Dashboard + Real-time Alerts
- [x] `getPatientByCode()` — looks up patient UID + displayName from 6-char code
- [x] `subscribeToAlerts()` — Firestore `onSnapshot` listener on `alerts` filtered by `patientUid`, ordered by `createdAt` desc
- [x] Caregiver dashboard shows patient's displayName (not just code)
- [x] Active alert displayed prominently with severity color, patient name, and timestamp
- [x] Alert history list with severity dots, timestamps, and cancelled/resolved status
- [x] Loading state while connecting to Firestore
- [x] Proper cleanup of `onSnapshot` listener on unmount
- [x] 0 TypeScript errors

---

## What's Next 🔜

### Step 4 — Push Notifications (Expo + Firebase Cloud Functions)
- [ ] Register Expo push token on login → save to `users/{uid}.expoPushToken`
- [ ] Create Firebase Cloud Function triggered by `alerts` document writes
- [ ] Function looks up all caregivers linked to the patient
- [ ] Sends Expo push notification via `https://exp.host/--/api/v2/push/send`
- [ ] GREEN: `"I think you should call {patient}"`
- [ ] YELLOW: `"Sir/Ma'am You should go back to {patient}"`
- [ ] Android notification channel setup (`expo-notifications` plugin in app.json)

### Step 5 — Alert Escalation Engine
- [ ] On patient device, after GREEN triggers:
  - Start 5-second timer → if patient doesn't cancel → YELLOW
  - Send local notification to patient with "I'm OK" action button
- [ ] On patient device, after YELLOW triggers:
  - Start 10-second timer → if patient doesn't cancel → RED
  - Send local notification to patient with "I'm OK" action button
- [ ] Tapping patient's notification or "I'm OK" button cancels escalation
- [ ] Update Firestore alert doc on each escalation (severity, timestamps)
- [ ] Handle notification response via `addNotificationResponseReceivedListener`

### Step 6 — RED Alert: SOS Morse + Critical Notification
- [ ] SOS Morse code vibration pattern: `··· −−− ···`
  - Pattern: `[0, 200, 100, 200, 100, 200, 300, 500, 100, 500, 100, 500, 300, 200, 100, 200, 100, 200]`
- [ ] SOS beep audio playback on caregiver phone (generate or bundle .wav)
- [ ] Android notification channel with `AndroidImportance.MAX` + alarm sound
- [ ] Full-screen / heads-up notification on caregiver phone
- [ ] Loop SOS pattern until caregiver acknowledges

### Step 7 — Polish & Edge Cases
- [ ] Background sensor monitoring (Android foreground service via `expo-task-manager`)
- [ ] Handle app kill / restart gracefully
- [ ] Rate-limit alerts (prevent duplicate alerts within 30s)
- [ ] Loading states, error handling, offline Firestore support
- [ ] Accessibility improvements (larger touch targets, screen reader labels)
- [ ] Multiple caregivers querying (currently 1 CG → 1 patient, but data model supports N CGs)

---

## Alert Escalation Timeline

```
t=0       detectFall() starts returning true
t=1s      Still true ──▸ 🟢 GREEN triggered
           → Push to caregivers: "I think you should call {patient}"
           → Local notification on patient: "I'm OK" button
t=6s      Patient didn't cancel (5s window) ──▸ 🟡 YELLOW triggered
           → Push to caregivers: "Sir/Ma'am You should go back to {patient}"
           → Local notification on patient: "I'm OK" button
t=16s     Patient didn't cancel (10s window) ──▸ 🔴 RED triggered
           → CG phones: SOS Morse beep + vibration
           → Critical push with alarm sound
```

---

## Useful Commands

```bash
# Start dev server
npx expo start

# Android dev build
eas build --profile development --platform android

# Type check
npx tsc --noEmit

# Regenerate typed routes after adding/removing route files
npx expo customize tsconfig.json
```

---

## Firebase Console

- **Project:** autocom-c0f98
- **Auth:** Email/Password enabled
- **Firestore:** `users` collection
- **Console URL:** https://console.firebase.google.com/project/autocom-c0f98

---

## Important Implementation Notes

1. **`detectFall()` returns true per-frame** — it's NOT a one-time event. The escalation system needs to track *sustained* true for 1 second before triggering GREEN.
2. **Patient cancels via notification tap** — use `addNotificationResponseReceivedListener` to detect taps and cancel the escalation timers.
3. **Expo push tokens change** — re-register on every app launch, not just first time.
4. **Firebase Cloud Functions** need a separate `functions/` directory with `npm init` — they're deployed via `firebase deploy --only functions`.
5. **`getReactNativePersistence`** requires `@ts-ignore` — this is a known Firebase SDK TS issue, the function exists at runtime.
