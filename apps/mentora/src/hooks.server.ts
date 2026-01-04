import { dev } from "$app/environment";
import { paraglideMiddleware } from "$lib/paraglide/server";
import type { Handle } from "@sveltejs/kit";

// Allowed origins for CORS in development (API Explorer)
const ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
];

const handleParaglide: Handle = ({ event, resolve }) =>
    paraglideMiddleware(event.request, ({ request, locale }) => {
        event.request = request;

        return resolve(event, {
            transformPageChunk: ({ html }) =>
                html.replace("%paraglide.lang%", locale),
        });
    });

/**
 * Handle CORS for API Explorer in development
 */
const handleCORS: Handle = async ({ event, resolve }) => {
    const origin = event.request.headers.get("origin");

    // Handle preflight OPTIONS requests
    if (event.request.method === "OPTIONS") {
        if (dev && origin && ALLOWED_ORIGINS.includes(origin)) {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods":
                        "GET, POST, PUT, DELETE, PATCH, OPTIONS",
                    "Access-Control-Allow-Headers":
                        "Content-Type, Authorization",
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Max-Age": "86400",
                },
            });
        }
    }

    const response = await resolve(event);

    // Add CORS headers to responses in development
    if (dev && origin && ALLOWED_ORIGINS.includes(origin)) {
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Credentials", "true");
    }

    return response;
};

export const handle: Handle = async ({ event, resolve }) => {
    // First handle CORS
    const corsResponse = await handleCORS({
        event,
        resolve: async (e) => {
            // Then handle Paraglide
            return handleParaglide({ event: e, resolve });
        },
    });
    return corsResponse;
};
