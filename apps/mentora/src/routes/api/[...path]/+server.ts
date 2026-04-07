import { env } from "$env/dynamic/private";
import {
    PUBLIC_FIREBASE_PROJECT_ID,
    PUBLIC_USE_FIREBASE_EMULATOR,
} from "$env/static/public";
import { firestore } from "$lib/server/firestore";
import { createServerHandler } from "mentora-api/server";
import type { RequestHandler } from "./$types";

const useEmulator = PUBLIC_USE_FIREBASE_EMULATOR === "true";

const handler = createServerHandler({
    firestore,
    geminiApiKey: env.GEMINI_API_KEY || env.GOOGLE_API_KEY,
    projectId: useEmulator ? "demo-mentora" : PUBLIC_FIREBASE_PROJECT_ID,
    useEmulator,
});

export const fallback: RequestHandler = async ({ params, request }) => {
    const path = "/" + params.path;
    return handler.handle(path, request);
};
