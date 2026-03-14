import { env } from "$env/dynamic/private";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json();
    const code = typeof body?.code === "string" ? body.code : "";
    const expected = env.MENTOR_ACCESS_CODE ?? "";

    if (!expected) {
        return json(
            { success: false, error: "Mentor access code is not configured" },
            { status: 500 },
        );
    }

    if (code === expected) {
        return json({ success: true });
    }

    return json(
        { success: false, error: "Invalid access code" },
        { status: 403 },
    );
};
