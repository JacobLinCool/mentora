import type { RequestHandler } from './$types';
import { createServerHandler } from '$lib/server';
import { Firestore } from 'fires2rest';

const firestore = Firestore.useEmulator();

const handler = createServerHandler({
	firestore,
	projectId: 'demo-no-project',
	useEmulator: true
});

export const fallback: RequestHandler = async ({ params, request }) => {
	const path = '/' + params.path;
	return handler.handle(path, request);
};
