import type { User } from 'firebase/auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callBackend } from '../src/lib/api/backend.js';
import { APIErrorCode, type MentoraAPIConfig } from '../src/lib/api/types.js';

type MockUser = {
	uid: string;
	getIdToken: () => Promise<string>;
};

function createConfig(overrides?: {
	currentUser?: MockUser | null;
	backendBaseUrl?: string;
}): MentoraAPIConfig {
	const currentUser =
		overrides && 'currentUser' in overrides
			? overrides.currentUser
			: {
					uid: 'test-user',
					getIdToken: vi.fn().mockResolvedValue('token-123')
				};

	return {
		auth: {} as MentoraAPIConfig['auth'],
		db: {} as MentoraAPIConfig['db'],
		backendBaseUrl: overrides?.backendBaseUrl ?? 'http://api.test',
		environment: { browser: false },
		getCurrentUser: () => currentUser as User | null
	};
}

describe('callBackend (Unit)', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it('returns NOT_AUTHENTICATED when no user and unauthenticated call is not allowed', async () => {
		const result = await callBackend(createConfig({ currentUser: null }), '/secure');
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('Not authenticated');
		}
	});

	it('allows unauthenticated call when explicitly enabled', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			})
		);
		globalThis.fetch = fetchSpy as typeof fetch;

		const result = await callBackend<{ ok: boolean }>(
			createConfig({ currentUser: null }),
			'/public',
			{},
			{ allowUnauthenticated: true }
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.ok).toBe(true);
		}
		expect(fetchSpy).toHaveBeenCalledOnce();
	});

	it('adds default JSON content type and authorization header for non-FormData body', async () => {
		const fetchSpy = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
			const headers = new Headers(init?.headers);
			expect(headers.get('content-type')).toBe('application/json');
			expect(headers.get('authorization')).toBe('Bearer token-123');
			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});
		});
		globalThis.fetch = fetchSpy as typeof fetch;

		const result = await callBackend<{ ok: boolean }>(createConfig(), '/json', {
			method: 'POST',
			body: JSON.stringify({ message: 'hello' })
		});
		expect(result.success).toBe(true);
	});

	it('does not force content type for FormData body', async () => {
		const fetchSpy = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
			const headers = new Headers(init?.headers);
			expect(headers.has('content-type')).toBe(false);
			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});
		});
		globalThis.fetch = fetchSpy as typeof fetch;

		const body = new FormData();
		body.set('field', 'value');
		const result = await callBackend<{ ok: boolean }>(createConfig(), '/form', {
			method: 'POST',
			body
		});
		expect(result.success).toBe(true);
	});

	it('maps HTTP status codes to API error codes', async () => {
		const cases: Array<{ status: number; code: APIErrorCode }> = [
			{ status: 400, code: APIErrorCode.INVALID_INPUT },
			{ status: 401, code: APIErrorCode.NOT_AUTHENTICATED },
			{ status: 403, code: APIErrorCode.PERMISSION_DENIED },
			{ status: 404, code: APIErrorCode.NOT_FOUND },
			{ status: 409, code: APIErrorCode.ALREADY_EXISTS }
		];

		for (const item of cases) {
			globalThis.fetch = vi.fn().mockResolvedValueOnce(
				new Response('Backend failure', {
					status: item.status,
					headers: { 'content-type': 'text/plain' }
				})
			) as typeof fetch;

			const result = await callBackend(createConfig(), '/mapped-error');
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.code).toBe(item.code);
				expect(result.error).toBe('Backend failure');
			}
		}
	});

	it('returns undefined payload on 204 response', async () => {
		globalThis.fetch = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 204 })) as typeof fetch;
		const result = await callBackend<void>(createConfig(), '/no-content');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBeUndefined();
		}
	});

	it('falls back to text payload when JSON parsing fails', async () => {
		const response = {
			ok: false,
			status: 500,
			headers: new Headers({ 'content-type': 'application/json' }),
			json: vi.fn().mockRejectedValue(new Error('invalid json')),
			text: vi.fn().mockResolvedValue('plain error payload')
		} as unknown as Response;

		globalThis.fetch = vi.fn().mockResolvedValue(response) as typeof fetch;

		const result = await callBackend(createConfig(), '/json-error');
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('plain error payload');
		}
	});

	it('falls back to HTTP status message when response body is empty', async () => {
		const response = {
			ok: false,
			status: 502,
			headers: new Headers({ 'content-type': 'text/plain' }),
			text: vi.fn().mockResolvedValue('   ')
		} as unknown as Response;

		globalThis.fetch = vi.fn().mockResolvedValue(response) as typeof fetch;
		const result = await callBackend(createConfig(), '/empty-error');
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('HTTP 502');
		}
	});

	it('normalizes network failure to NETWORK_ERROR', async () => {
		globalThis.fetch = vi.fn().mockRejectedValue(new Error('socket hang up')) as typeof fetch;
		const result = await callBackend(createConfig(), '/network-error');
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.code).toBe(APIErrorCode.NETWORK_ERROR);
			expect(result.error).toContain('Unable to connect to the server');
		}
	});
});
