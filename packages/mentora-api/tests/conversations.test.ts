/**
 * Integration Tests for conversation operations
 *
 * Tests the conversations module against real Firebase
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTeacherClient, teardownAllClients, generateTestId, delay } from './emulator-setup.js';
import type { MentoraClient } from '../src/lib/api/client.js';

describe('Conversations Module (Integration)', () => {
	let client: MentoraClient;
	let testCourseId: string | null = null;
	let testAssignmentId: string | null = null;
	let testConversationId: string | null = null;

	beforeAll(async () => {
		client = await setupTeacherClient();

		// Create a test course and assignment for conversation tests
		const courseResult = await client.courses.create(
			`Test Course for Conversations ${generateTestId()}`,
			`TC${Date.now().toString().slice(-6)}`,
			{ visibility: 'private' }
		);
		if (courseResult.success) {
			testCourseId = courseResult.data;

			const assignmentResult = await client.assignments.create({
				courseId: testCourseId,
				topicId: null,
				orderInTopic: null,
				title: `Test Assignment for Conversations ${generateTestId()}`,
				prompt: 'Integration test prompt',
				mode: 'instant',
				startAt: Date.now(),
				dueAt: null,
				allowLate: false,
				allowResubmit: true
			});
			if (assignmentResult.success) {
				testAssignmentId = assignmentResult.data;
			}
		}

		await delay(500);
	});

	afterAll(async () => {
		// Clean up - end conversation if started
		if (testConversationId) {
			try {
				await client.conversations.end(testConversationId);
			} catch {
				// Ignore cleanup errors
			}
		}
		// Clean up test assignment
		if (testAssignmentId) {
			try {
				await client.assignments.delete(testAssignmentId);
			} catch {
				// Ignore cleanup errors
			}
		}
		// Clean up test course
		if (testCourseId) {
			try {
				await client.courses.delete(testCourseId);
			} catch {
				// Ignore cleanup errors
			}
		}
		await teardownAllClients();
	});

	describe('createConversation()', () => {
		it('should create a new conversation', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const result = await client.conversations.create(testAssignmentId);

			expect(result.success).toBe(true);
			if (result.success) {
				testConversationId = result.data.id;
				expect(testConversationId).toBeDefined();
			}
		});
	});

	describe('getConversation()', () => {
		it('should get conversation by ID', async () => {
			if (!testConversationId) {
				console.log('Skipping - no test conversation created');
				return;
			}

			await delay(500);

			const result = await client.conversations.get(testConversationId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(testConversationId);
			}
		});

		it('should return failure for non-existent conversation', async () => {
			const result = await client.conversations.get('non-existent-conversation-id-12345');

			expect(result.success).toBe(false);
			if (!result.success) {
				// May get "Conversation not found" or permission error
				expect(result.error).toBeDefined();
			}
		});
	});

	describe('getAssignmentConversation()', () => {
		it('should get conversation for assignment', async () => {
			if (!testAssignmentId || !testConversationId) {
				console.log('Skipping - no test assignment/conversation created');
				return;
			}

			const result = await client.conversations.getForAssignment(testAssignmentId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(testConversationId);
			}
		});
	});

	describe('listMyConversations()', () => {
		it('should list current user conversations', async () => {
			const result = await client.conversations.listMine({ limit: 10 });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
			}
		});
	});

	describe('addTurn()', () => {
		it('should add a turn to conversation', async () => {
			if (!testConversationId) {
				console.log('Skipping - no test conversation created');
				return;
			}

			// This requires backend to be running - skip if not available
			const result = await client.conversations.addTurn(
				testConversationId,
				'Test user message',
				'idea'
			);

			// Backend may not be running in test environment
			if (!result.success && result.error?.includes('fetch')) {
				console.log('Skipping - backend not available');
				return;
			}

			expect(result.success).toBe(true);
		});
	});

	describe('endConversation()', () => {
		it('should end conversation', async () => {
			if (!testConversationId) {
				console.log('Skipping - no test conversation created');
				return;
			}

			const result = await client.conversations.end(testConversationId);

			// Backend may not be running in test environment
			if (!result.success && result.error?.includes('fetch')) {
				console.log('Skipping - backend not available');
				return;
			}

			expect(result.success).toBe(true);
			if (result.success) {
				testConversationId = null;
			}
		});
	});
});
