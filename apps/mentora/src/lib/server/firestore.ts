import { env } from "$env/dynamic/private";
import { PUBLIC_FIREBASE_PROJECT_ID } from "$env/static/public";
import { createFirestoreClient } from "firebase-rest-firestore";

const emulatorHost = env.FIRESTORE_EMULATOR_HOST;

// Set environment variable BEFORE any firebase-admin imports
// This ensures the SDK auto-detects the emulator
if (emulatorHost && typeof process !== "undefined") {
    process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
}

// Use globalThis to persist Firestore instance across Vite HMR reloads
declare global {
    var __firebaseAdminFirestore: FirebaseFirestore.Firestore | undefined;
}

export const firestore = createFirestoreClient({
    projectId: PUBLIC_FIREBASE_PROJECT_ID,
    privateKey: env.FIREBASE_PRIVATE_KEY,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
});
