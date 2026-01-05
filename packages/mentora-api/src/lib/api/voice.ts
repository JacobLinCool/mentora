/**
 * Voice operations (Text-to-Speech / Speech-to-Text)
 *
 * Delegated to backend for API key security.
 */
import { tryCatch, type APIResult, type MentoraAPIConfig } from './types.js';
import type { TranscriptionResult, SynthesizeResult } from 'mentora-firebase';

/**
 * Transcribe audio (Speech-to-Text)
 */
export async function transcribeAudio(
	config: MentoraAPIConfig,
	audioBlob: Blob
): Promise<APIResult<TranscriptionResult>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		// Voice services might require auth
		// throw new Error('Not authenticated');
	}

	return tryCatch(async () => {
		const token = currentUser ? await currentUser.getIdToken() : '';

		const formData = new FormData();
		formData.append('audio', audioBlob);
		formData.append('action', 'transcribe');

		const response = await fetch('/api/voice', {
			method: 'POST',
			headers: {
				Authorization: token ? `Bearer ${token}` : ''
				// Content-Type is auto-set by fetch when using FormData
			},
			body: formData
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: 'Failed to transcribe' }));
			throw new Error(error.message || `Transcribe failed: ${response.status}`);
		}

		return await response.json();
	});
}

/**
 * Synthesize speech (Text-to-Speech)
 */
export async function synthesizeSpeech(
	config: MentoraAPIConfig,
	text: string,
	voiceId?: string
): Promise<APIResult<SynthesizeResult>> {
	const currentUser = config.getCurrentUser();

	return tryCatch(async () => {
		const token = currentUser ? await currentUser.getIdToken() : '';

		const response = await fetch('/api/voice', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: token ? `Bearer ${token}` : ''
			},
			body: JSON.stringify({
				action: 'synthesize',
				text,
				voiceId
			})
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: 'Failed to synthesize' }));
			throw new Error(error.message || `Synthesize failed: ${response.status}`);
		}

		return await response.json();
	});
}
