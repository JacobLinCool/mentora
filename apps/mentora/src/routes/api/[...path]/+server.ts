import {
    PUBLIC_FIREBASE_PROJECT_ID,
    PUBLIC_USE_FIREBASE_EMULATOR,
} from "$env/static/public";
import { firestore } from "$lib/server/firestore";
import { createServerHandler } from "mentora-api/server";
import type { RequestHandler } from "./$types";

const handler = createServerHandler({
    firestore,
    projectId: PUBLIC_USE_FIREBASE_EMULATOR
        ? "demo-no-project"
        : PUBLIC_FIREBASE_PROJECT_ID,
    useEmulator: PUBLIC_USE_FIREBASE_EMULATOR === "true",
});

export const fallback: RequestHandler = async ({ params, request }) => {
    const path = "/" + params.path;
    return handler.handle(path, request);
};
