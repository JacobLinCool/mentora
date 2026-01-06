// MOCK API - Speech to Text
import { requireAuth } from "$lib/server/auth";
import { json, error as svelteError } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * POST /api/voice/transcribe
 * Convert audio to text (Speech-to-Text)
 *
 * Request: multipart/form-data with 'audio' field
 * Response: { text, confidence, duration }
 */
export const POST: RequestHandler = async (event) => {
    await requireAuth(event);

    const contentType = event.request.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
        throw svelteError(400, "Content-Type must be multipart/form-data");
    }

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

    // TODO: Integrate with speech-to-text service (e.g., Whisper, Google STT)
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

    return json({
        text: mockText,
        confidence: 0.85 + Math.random() * 0.1,
        duration: 3.5 + Math.random() * 2,
    });
};
