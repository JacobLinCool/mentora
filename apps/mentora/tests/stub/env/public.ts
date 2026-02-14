import dotenv from "dotenv";

dotenv.config();

export const PUBLIC_FIREBASE_API_KEY =
    process.env.PUBLIC_FIREBASE_API_KEY ?? "";
export const PUBLIC_FIREBASE_AUTH_DOMAIN =
    process.env.PUBLIC_FIREBASE_AUTH_DOMAIN ?? "";
export const PUBLIC_FIREBASE_PROJECT_ID =
    process.env.PUBLIC_FIREBASE_PROJECT_ID ?? "";
export const PUBLIC_FIREBASE_APP_ID = process.env.PUBLIC_FIREBASE_APP_ID ?? "";
export const PUBLIC_USE_FIREBASE_EMULATOR =
    process.env.PUBLIC_USE_FIREBASE_EMULATOR ?? "false";
