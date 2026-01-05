import { dev } from "$app/environment";
import { paraglideMiddleware } from "$lib/paraglide/server";
import type { Handle } from "@sveltejs/kit";

/**
 * Check if origin is allowed for CORS in development (all local origins)
 */
function isAllowedOrigin(origin: string | null): boolean {
    if (!origin) return false;
    try {
        const url = new URL(origin);
        return url.hostname === "localhost" || url.hostname === "127.0.0.1";
    } catch {
        return false;
    }
}

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
        if (dev && isAllowedOrigin(origin)) {
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
    if (dev && isAllowedOrigin(origin)) {
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
