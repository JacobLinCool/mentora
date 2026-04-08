import { PUBLIC_POSTHOG_PROJECT_TOKEN } from "$env/static/public";
import type { HandleClientError } from "@sveltejs/kit";
import posthog from "posthog-js";

export async function init() {
    if (PUBLIC_POSTHOG_PROJECT_TOKEN) {
        posthog.init(PUBLIC_POSTHOG_PROJECT_TOKEN, {
            api_host: "/ingest",
            ui_host: "https://us.posthog.com",
            person_profiles: "identified_only",
            capture_pageview: true,
            capture_pageleave: true,
        });
    }
}

export const handleError: HandleClientError = async ({
    error,
    status,
    message,
}) => {
    posthog.captureException(error);
    return { message, status };
};
