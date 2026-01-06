/**
 * Voice API - Speech-to-text and text-to-speech endpoints
 *
 * POST /api/voice
 *
 * Actions:
 * - transcribe: Convert audio to text
 * - synthesize: Convert text to speech
 */
import { requireAuth } from "$lib/server/auth";
import { json, error as svelteError } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

// TODO: Integrate with speech services
// import { transcribeAudio, synthesizeSpeech } from "$lib/server/voice";

export const POST: RequestHandler = async (event) => {
    await requireAuth(event);

    const contentType = event.request.headers.get("content-type") || "";

    // Handle multipart form data (audio upload)
    if (contentType.includes("multipart/form-data")) {
        return handleTranscribe(event);
    }

    // Handle JSON (text-to-speech or action-based)
    const body = await event.request.json();
    const { action } = body;

    switch (action) {
        case "synthesize":
            return handleSynthesize(body);
        case "transcribe":
            throw svelteError(400, "Use multipart/form-data for transcription");
        default:
            // Default to synthesize for backward compatibility
            if (body.text) {
                return handleSynthesize(body);
            }
            throw svelteError(400, "Unknown action or missing parameters");
    }
};

async function handleTranscribe(event: Parameters<RequestHandler>[0]) {
    const formData = await event.request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof File)) {
        throw svelteError(400, "Missing or invalid audio file");
    }

    // Validate file type
    const validTypes = [
        "audio/webm",
        "audio/mp3",
        "audio/mpeg",
        "audio/wav",
        "audio/ogg",
    ];
    if (!validTypes.includes(audioFile.type)) {
        throw svelteError(
            400,
            `Invalid audio format. Supported: ${validTypes.join(", ")}`,
        );
    }

    // TODO: Integrate with speech-to-text service
    const mockTranscriptions = [
        "I believe the main argument here is about finding balance between efficiency and accessibility.",
        "Looking at this from multiple perspectives, we can see both advantages and disadvantages.",
        "My initial thought is that this approach could work, but there are some concerns.",
        "I think the key factor to consider is how this affects different stakeholders.",
        "Based on the evidence presented, I would argue that the benefits outweigh the risks.",
    ];

    const mockText =
        mockTranscriptions[
            Math.floor(Math.random() * mockTranscriptions.length)
        ];

    const response = {
        text: mockText,
        confidence: 0.85 + Math.random() * 0.1,
        duration: 3.5 + Math.random() * 2,
    };

    return json(response);
}

function handleSynthesize(body: { text?: string; voice?: string }) {
    const { text } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
        throw svelteError(400, "Missing or empty text");
    }

    if (text.length > 5000) {
        throw svelteError(400, "Text too long (max 5000 characters)");
    }

    // TODO: Integrate with text-to-speech service
    // Return minimal valid MP3 (silence) for testing
    const silentMp3 = new Uint8Array([
        0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x58, 0x69, 0x6e, 0x67, 0x00, 0x00, 0x00, 0x0f, 0x00, 0x00, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x24, 0x00, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80,
        0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80,
        0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80,
        0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80,
        0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0xff, 0xfb, 0x90, 0x00,
    ]);

    // Convert to Base64
    const audioContent = Buffer.from(silentMp3).toString("base64");

    const response = {
        audioContent,
        contentType: "audio/mpeg",
    };

    return json(response);
}
