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
    langfuse: {
        publicKey: env.LANGFUSE_PUBLIC_KEY,
        secretKey: env.LANGFUSE_SECRET_KEY,
        host: env.LANGFUSE_HOST || env.LANGFUSE_BASE_URL,
        environment: env.LANGFUSE_TRACING_ENVIRONMENT,
        release: env.LANGFUSE_RELEASE,
    },
});

export const fallback: RequestHandler = async ({ params, request }) => {
    const path = "/" + params.path;
    return handler.handle(path, request);
};
