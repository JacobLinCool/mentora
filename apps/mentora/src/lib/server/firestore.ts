import { env } from "$env/dynamic/private";
import { PUBLIC_FIREBASE_PROJECT_ID } from "$env/static/public";
import { Firestore } from "fires2rest";

export const firestore = new Firestore({
    projectId: PUBLIC_FIREBASE_PROJECT_ID,
    privateKey: env.FIREBASE_PRIVATE_KEY,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
});
