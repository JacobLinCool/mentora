import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { createServerHandler } from '$lib/server';
import { Firestore } from 'fires2rest';

const firestore = Firestore.useEmulator({ projectId: 'demo-mentora' });

const handler = createServerHandler({
	firestore,
	geminiApiKey: env.GEMINI_API_KEY || env.GOOGLE_API_KEY,
	projectId: 'demo-mentora',
	useEmulator: true
});

export const fallback: RequestHandler = async ({ params, request }) => {
	const path = '/' + params.path;
	return handler.handle(path, request);
};
