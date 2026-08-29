import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "@/firebaseConfig";
import { getUserDoc, createUserDoc, type UserDoc, type UserRole } from "@/lib/firestore";

// ── Context Types ──────────────────────────────────────────────

interface AuthContextValue {
  /** Firebase Auth user (null if logged out, undefined if loading) */
  user: User | null | undefined;
  /** Firestore user document (null if not yet created/fetched) */
  userDoc: UserDoc | null;
  /** True while initial auth state is being resolved */
  loading: boolean;
  /** Sign in with email/password */
  signIn: (email: string, password: string) => Promise<void>;
  /** Register with email/password and display name */
  register: (email: string, password: string, displayName: string) => Promise<User>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Set role after registration and create Firestore user doc */
  setRole: (role: UserRole) => Promise<UserDoc>;
  /** Reload user doc from Firestore */
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch Firestore user doc
        const fetchedDoc = await getUserDoc(firebaseUser.uid);
        setUserDoc(fetchedDoc);
      } else {
        setUserDoc(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const fetchedDoc = await getUserDoc(cred.user.uid);
    setUserDoc(fetchedDoc);
  };

  const register = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<User> => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    return cred.user;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserDoc(null);
  };

  const setRole = async (role: UserRole): Promise<UserDoc> => {
    if (!user) throw new Error("Must be authenticated to set role");
    const createdDoc = await createUserDoc(
      user.uid,
      user.email ?? "",
      user.displayName ?? "",
      role
    );
    setUserDoc(createdDoc);
    return createdDoc;
  };

  const refreshUserDoc = async () => {
    if (!user) return;
    const fetchedDoc = await getUserDoc(user.uid);
    setUserDoc(fetchedDoc);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userDoc,
        loading,
        signIn,
        register,
        signOut,
        setRole,
        refreshUserDoc,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
