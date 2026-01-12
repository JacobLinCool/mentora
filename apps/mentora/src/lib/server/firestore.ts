import { env } from "$env/dynamic/private";
import {
    PUBLIC_FIREBASE_PROJECT_ID,
    PUBLIC_USE_FIREBASE_EMULATOR,
} from "$env/static/public";
import { Firestore } from "fires2rest";

const useEmulator = PUBLIC_USE_FIREBASE_EMULATOR === "true";

export const firestore = useEmulator
    ? Firestore.useEmulator()
    : Firestore.useServiceAccount(PUBLIC_FIREBASE_PROJECT_ID, {
          privateKey: env.FIREBASE_PRIVATE_KEY,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
      });
