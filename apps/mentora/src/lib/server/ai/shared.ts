import { env } from "$env/dynamic/private";
import { OpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod/v3";

const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_API_BASE_URL || undefined,
});

const google = new OpenAI({
    apiKey: env.GEMINI_API_KEY,
    baseURL:
        env.GEMINI_API_BASE_URL ||
        "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export const ai = {
    openai,
    google,
};

export { z, zodResponseFormat };
