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

// Helper to init admin lazily to avoid build issues in Edge
const initAdmin = async (): Promise<FirebaseFirestore.Firestore> => {
    // Return cached instance if available (persists across HMR)
    if (globalThis.__firebaseAdminFirestore) {
        return globalThis.__firebaseAdminFirestore;
    }

    try {
        const adminImport = await import("firebase-admin");
        const admin = adminImport.default || adminImport;
        const { getFirestore } = await import("firebase-admin/firestore");

        // Use emulator project ID when connecting to emulator
        const projectId = emulatorHost
            ? "mentora-test"
            : PUBLIC_FIREBASE_PROJECT_ID;

        if (!admin.apps?.length) {
            admin.initializeApp({ projectId });
        }

        const db = getFirestore();
        globalThis.__firebaseAdminFirestore = db;
        return db;
    } catch (e) {
        console.error("[SERVER CRITICAL ERROR] initAdmin failed:", e);
        throw e;
    }
};

let firestoreInstance:
    | ReturnType<typeof createFirestoreClient>
    | FirebaseFirestore.Firestore;

if (emulatorHost) {
    console.error(
        "[SERVER DEBUG] Initializing Firebase Admin with Host:",
        emulatorHost,
    );
    firestoreInstance = await initAdmin();
} else {
    // Production / Edge
    firestoreInstance = createFirestoreClient({
        projectId: PUBLIC_FIREBASE_PROJECT_ID,
        privateKey: env.FIREBASE_PRIVATE_KEY,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
    });
}

export const firestore = firestoreInstance;
