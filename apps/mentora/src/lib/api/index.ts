import { browser } from "$app/environment";
import { auth, db } from "$lib/firebase";
import { MentoraAPI } from "mentora-api/svelte";

export const api = new MentoraAPI({
    environment: { browser },
    auth,
    db,
    backendBaseUrl: "/api",
});

export * from "mentora-api";
