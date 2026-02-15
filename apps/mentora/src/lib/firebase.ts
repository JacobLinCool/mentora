import { browser } from "$app/environment";
import {
    PUBLIC_FIREBASE_API_KEY,
    PUBLIC_FIREBASE_APP_ID,
    PUBLIC_FIREBASE_AUTH_DOMAIN,
    PUBLIC_FIREBASE_PROJECT_ID,
    PUBLIC_USE_FIREBASE_EMULATOR,
} from "$env/static/public";
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

// Connect to emulators in development mode if enabled
// Set PUBLIC_USE_FIREBASE_EMULATOR=true in .env to use local emulators
const useEmulator = PUBLIC_USE_FIREBASE_EMULATOR === "true";

const firebaseConfig = {
    apiKey: PUBLIC_FIREBASE_API_KEY,
    authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: useEmulator ? "demo-no-project" : PUBLIC_FIREBASE_PROJECT_ID,
    appId: PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);

if (browser && useEmulator) {
    console.log("Connecting to Firebase Emulators");
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
        disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
