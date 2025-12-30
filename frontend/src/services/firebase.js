import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAYS7rcuxoC7WWie9abO5e06IuWGhNYhwE",
  authDomain: "shophub-8c074.firebaseapp.com",
  projectId: "shophub-8c074",
  storageBucket: "shophub-8c074.firebasestorage.app",
  messagingSenderId: "200436050970",
  appId: "1:200436050970:web:f80d7cdc81aa9972d4b5a3",
  measurementId: "G-J00VXFFKG6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export default app;
