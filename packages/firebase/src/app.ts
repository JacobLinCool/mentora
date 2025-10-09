// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// These are intentionally hardcoded, they are not secrets
const firebaseConfig = {
    apiKey: "AIzaSyCMXQsEdCKChh-D_tfxWz6RBXzlO8q04ew",
    authDomain: "mentora-apps.firebaseapp.com",
    projectId: "mentora-apps",
    storageBucket: "mentora-apps.firebasestorage.app",
    messagingSenderId: "37581253555",
    appId: "1:37581253555:web:bf735299c38e3e21b079c6",
    measurementId: "G-1C82FFY50Q",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
