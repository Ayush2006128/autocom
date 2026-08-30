import {
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
  orderBy,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";

// ── Types ──────────────────────────────────────────────────────

export type UserRole = "patient" | "caregiver";

export interface UserDoc {
  email: string;
  displayName: string;
  role: UserRole;
  patientId?: string;        // 6-char code, only for patients
  linkedPatientId?: string;  // for caregivers — the patientId they monitor
  expoPushToken?: string;
  createdAt: Timestamp;
}

export interface AlertDoc {
  patientUid: string;
  patientName: string;
  severity: "green" | "yellow" | "red";
  status: "active" | "cancelled" | "resolved";
  createdAt: Timestamp;
  escalatedToYellowAt?: Timestamp;
  escalatedToRedAt?: Timestamp;
  cancelledAt?: Timestamp;
}

// ── Patient ID Generation ──────────────────────────────────────

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion

function generatePatientId(): string {
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return id;
}

/** Generate a unique patient ID that doesn't collide with existing ones */
async function generateUniquePatientId(): Promise<string> {
  const usersRef = collection(db, "users");
  let attempts = 0;
  while (attempts < 10) {
    const id = generatePatientId();
    const q = query(usersRef, where("patientId", "==", id));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return id;
    attempts++;
  }
  throw new Error("Failed to generate unique patient ID after 10 attempts");
}

// ── User CRUD ──────────────────────────────────────────────────

/** Create a new user document after registration */
export async function createUserDoc(
  uid: string,
  email: string,
  displayName: string,
  role: UserRole
): Promise<UserDoc> {
  const userRef = doc(db, "users", uid);

  const userData: Record<string, unknown> = {
    email,
    displayName,
    role,
    createdAt: serverTimestamp(),
  };

  if (role === "patient") {
    userData.patientId = await generateUniquePatientId();
  }

  await setDoc(userRef, userData);

  // Return the doc (serverTimestamp won't resolve until read back)
  const snap = await getDoc(userRef);
  return snap.data() as UserDoc;
}

/** Fetch the user document for a given UID */
export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

/** Link a caregiver to a patient by the patient's 6-char code */
export async function linkCaregiverToPatient(
  caregiverUid: string,
  patientCode: string
): Promise<{ success: boolean; patientName?: string; error?: string }> {
  // Find the patient with this code
  const usersRef = collection(db, "users");
  const q = query(
    usersRef,
    where("patientId", "==", patientCode.toUpperCase()),
    where("role", "==", "patient")
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return { success: false, error: "No patient found with that code" };
  }

  const patientDoc = snapshot.docs[0];
  const patientData = patientDoc.data() as UserDoc;

  // Update the caregiver's doc with the linked patient ID
  await setDoc(
    doc(db, "users", caregiverUid),
    { linkedPatientId: patientData.patientId },
    { merge: true }
  );

  return { success: true, patientName: patientData.displayName };
}

/** Save Expo push token to user doc */
export async function saveExpoPushToken(
  uid: string,
  token: string
): Promise<void> {
  await setDoc(doc(db, "users", uid), { expoPushToken: token }, { merge: true });
}

// ── Alert CRUD ─────────────────────────────────────────────────

/** Create a new GREEN alert document. Returns the auto-generated doc ID. */
export async function createAlert(
  patientUid: string,
  patientName: string
): Promise<string> {
  const alertData = {
    patientUid,
    patientName,
    severity: "green" as const,
    status: "active" as const,
    createdAt: serverTimestamp(),
  };

  const alertRef = await addDoc(collection(db, "alerts"), alertData);
  return alertRef.id;
}

/** Cancel an active alert (patient pressed "I'm OK"). */
export async function cancelAlert(alertId: string): Promise<void> {
  await setDoc(
    doc(db, "alerts", alertId),
    {
      status: "cancelled",
      cancelledAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// ── Patient Lookup ─────────────────────────────────────────────

/** Look up a patient's UID and displayName from their 6-char patientId code. */
export async function getPatientByCode(
  patientCode: string
): Promise<{ uid: string; displayName: string } | null> {
  const usersRef = collection(db, "users");
  const q = query(
    usersRef,
    where("patientId", "==", patientCode.toUpperCase()),
    where("role", "==", "patient")
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const patientDoc = snapshot.docs[0];
  return { uid: patientDoc.id, displayName: (patientDoc.data() as UserDoc).displayName };
}

// ── Alert Subscriptions ────────────────────────────────────────

/** Alert doc with its Firestore document ID attached. */
export interface AlertDocWithId extends AlertDoc {
  id: string;
}

/**
 * Subscribe to real-time alert updates for a given patient UID.
 * Returns an unsubscribe function.
 */
export function subscribeToAlerts(
  patientUid: string,
  onUpdate: (alerts: AlertDocWithId[]) => void
): Unsubscribe {
  const alertsRef = collection(db, "alerts");
  const q = query(
    alertsRef,
    where("patientUid", "==", patientUid),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const alerts: AlertDocWithId[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as AlertDoc),
    }));
    onUpdate(alerts);
  });
}
