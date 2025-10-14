import { env } from "$env/dynamic/private";
import { createFirestoreClient } from "firebase-rest-firestore";

export const firestore = createFirestoreClient({
    projectId: env.PUBLIC_FIREBASE_PROJECT_ID || "",
    privateKey: env.FIREBASE_PRIVATE_KEY,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
});
