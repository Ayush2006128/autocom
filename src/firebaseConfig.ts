import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, type Auth } from "firebase/auth";
// @ts-ignore — getReactNativePersistence is not in the TS types but exists at runtime
import { getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAOsD4BdWPhmUgAVShph48kGgVpf-YoYNc",
  authDomain: "autocom-c0f98.firebaseapp.com",
  projectId: "autocom-c0f98",
  storageBucket: "autocom-c0f98.firebasestorage.app",
  messagingSenderId: "451091838379",
  appId: "1:451091838379:web:c265e22c188266a8a88eee",
  measurementId: "G-D9PWDQTNG4",
};

// Prevent duplicate initialization during Fast Refresh
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use initializeAuth with AsyncStorage persistence for React Native.
// This ensures auth state persists across app restarts on Android.
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // If auth is already initialized (Fast Refresh), reuse it
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
