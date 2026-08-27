import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAOsD4BdWPhmUgAVShph48kGgVpf-YoYNc",
  authDomain: "autocom-c0f98.firebaseapp.com",
  projectId: "autocom-c0f98",
  storageBucket: "autocom-c0f98.firebasestorage.app",
  messagingSenderId: "451091838379",
  appId: "1:451091838379:web:c265e22c188266a8a88eee",
  measurementId: "G-D9PWDQTNG4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
