import { describe, expect, it } from 'vitest';
import * as api from '../src/lib/api/index.js';

describe('API index exports', () => {
	it('re-exports core API surface', () => {
		expect(api.MentoraClient).toBeDefined();
		expect(api.callBackend).toBeDefined();
		expect(api.APIErrorCode).toBeDefined();
		expect(api.success).toBeDefined();
		expect(api.failure).toBeDefined();
	});

	it('exports correct types', () => {
		expect(typeof api.MentoraClient).toBe('function');
		expect(typeof api.callBackend).toBe('function');
		expect(typeof api.APIErrorCode).toBe('object');
		expect(typeof api.success).toBe('function');
		expect(typeof api.failure).toBe('function');
	});
});
