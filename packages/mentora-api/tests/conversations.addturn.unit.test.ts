import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as BackendModule from '../src/lib/api/backend.js';
import { MentoraClient } from '../src/lib/api/client.js';
import * as ConversationsModule from '../src/lib/api/conversations.js';
import type { MentoraAPIConfig } from '../src/lib/api/types.js';

function createConfig(): MentoraAPIConfig {
	return {
		auth: {} as MentoraAPIConfig['auth'],
		db: {} as MentoraAPIConfig['db'],
		backendBaseUrl: 'http://api.test',
		environment: { browser: false },
		getCurrentUser: () =>
			({
				uid: 'user_1',
				getIdToken: vi.fn().mockResolvedValue('token-1')
			}) as unknown as ReturnType<MentoraAPIConfig['getCurrentUser']>
	};
}

function createClient(): MentoraClient {
	const mockUser = {
		uid: 'client-user',
		getIdToken: vi.fn().mockResolvedValue('token-client')
	};
	const auth = {
		onAuthStateChanged: (callback: (user: unknown) => void) => {
			callback(mockUser);
			return () => {};
		},
		authStateReady: () => Promise.resolve()
	} as unknown as MentoraAPIConfig['auth'];

	return new MentoraClient({
		auth,
		db: {} as MentoraAPIConfig['db'],
		backendBaseUrl: 'http://api.test',
		environment: { browser: false }
	});
}

describe('conversations.addTurn payload handling', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('sends text payload as JSON body', async () => {
		const backendSpy = vi.spyOn(BackendModule, 'callBackend').mockResolvedValue({
			success: true,
			data: {
				text: 'ok',
				audio: 'base64-audio',
				audioMimeType: 'audio/mp3',
				tokenUsage: { byFeature: {}, totals: {} }
			}
		});

		const config = createConfig();
		const result = await ConversationsModule.addTurn(config, 'conv-1', { text: 'hello world' });
		expect(result.success).toBe(true);
		expect(backendSpy).toHaveBeenCalledWith(config, '/conversations/conv-1/turns', {
			method: 'POST',
			body: JSON.stringify({ text: 'hello world' })
		});
	});

	it('sends audioBase64 payload as JSON body', async () => {
		const backendSpy = vi.spyOn(BackendModule, 'callBackend').mockResolvedValue({
			success: true,
			data: {
				text: 'ok',
				audio: 'base64-audio',
				audioMimeType: 'audio/mp3',
				tokenUsage: { byFeature: {}, totals: {} }
			}
		});

		const config = createConfig();
		await ConversationsModule.addTurn(config, 'conv-2', {
			audioBase64: 'dGVzdC1hdWRpbw==',
			audioMimeType: 'audio/wav'
		});

		expect(backendSpy).toHaveBeenCalledWith(config, '/conversations/conv-2/turns', {
			method: 'POST',
			body: JSON.stringify({
				audioBase64: 'dGVzdC1hdWRpbw==',
				audioMimeType: 'audio/wav'
			})
		});
	});

	it('sends Blob audio payload as multipart FormData and trims optional text', async () => {
		const backendSpy = vi.spyOn(BackendModule, 'callBackend').mockResolvedValue({
			success: true,
			data: {
				text: 'ok',
				audio: 'base64-audio',
				audioMimeType: 'audio/mp3',
				tokenUsage: { byFeature: {}, totals: {} }
			}
		});

		const config = createConfig();
		const audioBlob = new Blob(['fake-audio'], { type: 'audio/wav' });
		await ConversationsModule.addTurn(config, 'conv-3', {
			audio: audioBlob,
			text: '  hello audio  '
		});

		const lastCall = backendSpy.mock.calls.at(-1);
		expect(lastCall).toBeDefined();
		expect(lastCall?.[0]).toBe(config);
		expect(lastCall?.[1]).toBe('/conversations/conv-3/turns');
		expect(lastCall?.[2]?.method).toBe('POST');
		expect(lastCall?.[2]?.body).toBeInstanceOf(FormData);

		const formData = lastCall?.[2]?.body as FormData;
		expect(formData.get('text')).toBe('hello audio');
		expect(formData.get('audio')).toBeInstanceOf(Blob);
	});
});

describe('MentoraClient.conversations.addTurn normalization', () => {
	it('normalizes string/text/audio inputs before delegating to conversations.addTurn', async () => {
		const addTurnSpy = vi.spyOn(ConversationsModule, 'addTurn').mockResolvedValue({
			success: true,
			data: {
				text: 'ok',
				audio: 'base64-audio',
				audioMimeType: 'audio/mp3',
				tokenUsage: { byFeature: {}, totals: {} }
			}
		});

		const client = createClient();
		await client.authReady;

		await client.conversations.addTurn('conversation-1', 'raw string input', 'idea');
		expect(addTurnSpy).toHaveBeenNthCalledWith(1, expect.any(Object), 'conversation-1', {
			text: 'raw string input'
		});

		await client.conversations.addTurn('conversation-1', { text: 'object text' });
		expect(addTurnSpy).toHaveBeenNthCalledWith(2, expect.any(Object), 'conversation-1', {
			text: 'object text'
		});

		await client.conversations.addTurn('conversation-1', {
			audioBase64: 'ZmFrZS1iYXNlNjQ=',
			audioMimeType: 'audio/mp3'
		});
		expect(addTurnSpy).toHaveBeenNthCalledWith(3, expect.any(Object), 'conversation-1', {
			audioBase64: 'ZmFrZS1iYXNlNjQ=',
			audioMimeType: 'audio/mp3'
		});

		const blob = new Blob(['audio'], { type: 'audio/mp3' });
		await client.conversations.addTurn('conversation-1', { audio: blob, text: 'voice note' });
		expect(addTurnSpy).toHaveBeenNthCalledWith(4, expect.any(Object), 'conversation-1', {
			audio: blob,
			text: 'voice note'
		});
	});
});
