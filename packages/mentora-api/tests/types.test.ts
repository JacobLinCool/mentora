/**
 * Tests for the types module
 *
 * Tests for helper functions: success, failure, tryCatch
 */

import { describe, it, expect } from 'vitest';
import { success, failure, tryCatch, APIErrorCode } from '../src/lib/api/types.js';

describe('Types Module', () => {
	describe('success()', () => {
		it('should create a success result with data', () => {
			const result = success({ id: '123', name: 'Test' });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual({ id: '123', name: 'Test' });
			}
		});

		it('should handle null data', () => {
			const result = success(null);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBeNull();
			}
		});

		it('should handle undefined data', () => {
			const result = success(undefined);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBeUndefined();
			}
		});
	});

	describe('failure()', () => {
		it('should create a failure result with string error', () => {
			const result = failure('Something went wrong');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Something went wrong');
				expect(result.code).toBeUndefined();
			}
		});

		it('should create a failure result with Error object', () => {
			const error = new Error('Error message');
			const result = failure(error);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Error message');
			}
		});

		it('should extract readable error from JSON string payload', () => {
			const result = failure(
				'{"success":false,"error":"Invalid course code format","code":"INVALID_INPUT"}'
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Invalid course code format');
				expect(result.code).toBe(APIErrorCode.INVALID_INPUT);
			}
		});

		it('should extract nested message from object payload', () => {
			const result = failure({
				error: {
					message: 'Permission denied',
					status: 'PERMISSION_DENIED'
				}
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Permission denied');
				expect(result.code).toBe(APIErrorCode.PERMISSION_DENIED);
			}
		});

		it('should include error code when provided', () => {
			const result = failure('Not found', APIErrorCode.NOT_FOUND);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Not found');
				expect(result.code).toBe(APIErrorCode.NOT_FOUND);
			}
		});

		it('should handle all error codes', () => {
			const codes = [
				APIErrorCode.NOT_AUTHENTICATED,
				APIErrorCode.NOT_FOUND,
				APIErrorCode.PERMISSION_DENIED,
				APIErrorCode.ALREADY_EXISTS,
				APIErrorCode.INVALID_INPUT,
				APIErrorCode.NETWORK_ERROR,
				APIErrorCode.UNKNOWN
			];

			for (const code of codes) {
				const result = failure('Error', code);
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.code).toBe(code);
				}
			}
		});
	});

	describe('tryCatch()', () => {
		it('should return success when function resolves', async () => {
			const result = await tryCatch(async () => {
				return { id: '123' };
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual({ id: '123' });
			}
		});

		it('should return failure when function throws Error', async () => {
			const result = await tryCatch(async () => {
				throw new Error('Test error');
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Test error');
			}
		});

		it('should return failure with "Unknown error" for non-Error throws', async () => {
			const result = await tryCatch(async () => {
				throw 'String error';
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Unknown error');
			}
		});

		it('should handle async operations', async () => {
			const result = await tryCatch(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return 'delayed result';
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe('delayed result');
			}
		});
	});

	describe('APIErrorCode enum', () => {
		it('should have correct values', () => {
			expect(APIErrorCode.NOT_AUTHENTICATED).toBe('NOT_AUTHENTICATED');
			expect(APIErrorCode.NOT_FOUND).toBe('NOT_FOUND');
			expect(APIErrorCode.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
			expect(APIErrorCode.ALREADY_EXISTS).toBe('ALREADY_EXISTS');
			expect(APIErrorCode.INVALID_INPUT).toBe('INVALID_INPUT');
			expect(APIErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
			expect(APIErrorCode.UNKNOWN).toBe('UNKNOWN');
		});
	});
});
