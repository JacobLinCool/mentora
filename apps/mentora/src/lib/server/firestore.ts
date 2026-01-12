import { env } from "$env/dynamic/private";
import {
    PUBLIC_FIREBASE_PROJECT_ID,
    PUBLIC_USE_FIREBASE_EMULATOR,
} from "$env/static/public";
import { Firestore } from "fires2rest";

export const firestore = PUBLIC_USE_FIREBASE_EMULATOR
    ? Firestore.useEmulator()
    : Firestore.useServiceAccount(PUBLIC_FIREBASE_PROJECT_ID, {
          privateKey: env.FIREBASE_PRIVATE_KEY,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
      });
