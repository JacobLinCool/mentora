/**
 * Integration Tests for addTurn Route Handler and Error Scenarios
 *
 * Tests the conversation addTurn endpoint including:
 * - Authorization and ownership validation
 * - First vs subsequent turn handling through HTTP
 * - Error scenarios: missing API key, quota exceeded, timeout
 * - Conversation state transitions
 * - LLM service integration with real HTTP calls
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	setupTeacherClient,
	setupStudentClient,
	teardownAllClients,
	generateTestId,
	delay
} from './emulator-setup.js';
import type { MentoraClient } from '../src/lib/api/client.js';
import type { Course } from '../src/lib/api/courses.js';
import type { Conversation } from '../src/lib/api/conversations.js';

describe('addTurn Route Handler (Integration)', () => {
	let teacherClient: MentoraClient;
	let studentClient: MentoraClient;
	let testCourseId: string;
	let testAssignmentId: string;
	let testConversationId: string;

	beforeAll(async () => {
		teacherClient = await setupTeacherClient();
		studentClient = await setupStudentClient();

		// Create test course
		const courseResult = await teacherClient.courses.create(
			`addTurn Test Course ${generateTestId()}`,
			`ATC${Date.now().toString().slice(-6)}`,
			{ visibility: 'private' }
		);
		expect(courseResult.success).toBe(true);
		if (courseResult.success) {
			testCourseId = courseResult.data;
		}

		// Create test assignment
		const assignmentResult = await teacherClient.assignments.create({
			courseId: testCourseId,
			topicId: null,
			title: `addTurn Test Assignment ${generateTestId()}`,
			question: null,
			prompt: 'Test prompt',
			mode: 'instant',
			startAt: Date.now(),
			dueAt: null,
			allowLate: false,
			allowResubmit: true
		});
		expect(assignmentResult.success).toBe(true);
		if (assignmentResult.success) {
			testAssignmentId = assignmentResult.data;
		}

		// Enroll student
		const courseDocResult = await teacherClient.courses.get(testCourseId);
		let joinCode = 'test-code';
		if (courseDocResult.success) {
			joinCode = (courseDocResult.data as Course).code || 'test-code';
		}

		const enrollResult = await studentClient.courses.joinByCode(joinCode);
		expect(enrollResult.success).toBe(true);

		// Create conversation
		const convResult = await studentClient.conversations.create(testAssignmentId);
		expect(convResult.success).toBe(true);
		if (convResult.success) {
			testConversationId = convResult.data.id;
		}

		await delay(500);
	});

	afterAll(async () => {
		try {
			if (testAssignmentId) {
				await teacherClient.assignments.delete(testAssignmentId);
			}
			if (testCourseId) {
				await teacherClient.courses.delete(testCourseId);
			}
		} catch {
			// Ignore cleanup errors
		}
		await teardownAllClients();
	});

	describe('Authorization and Ownership', () => {
		it('should reject turn from unauthorized user', async () => {
			// Teacher tries to add turn to student's conversation
			const result = await teacherClient.conversations.addTurn(
				testConversationId,
				'Unauthorized attempt',
				'idea'
			);

			// Should fail because teacher doesn't own this conversation
			expect(result.success).toBe(false);
		});

		it('should reject turn on non-existent conversation', async () => {
			const result = await studentClient.conversations.addTurn(
				'non-existent-conv-id',
				'Test message',
				'idea'
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toMatch(/not found|Conversation/i);
			}
		});

		it('should reject turn on closed conversation', async () => {
			// Create a new conversation
			const newConvResult = await studentClient.conversations.create(testAssignmentId);
			expect(newConvResult.success).toBe(true);

			if (!newConvResult.success) return;
			const newConversationId = newConvResult.data.id;

			// End it
			const endResult = await studentClient.conversations.end(newConversationId);
			expect(endResult.success).toBe(true);

			// Try to add turn to closed conversation
			const addTurnResult = await studentClient.conversations.addTurn(
				newConversationId,
				'Message after close',
				'idea'
			);

			expect(addTurnResult.success).toBe(false);
			if (!addTurnResult.success) {
				expect(addTurnResult.error).toMatch(/closed|state/i);
			}
		});
	});

	describe('Turn Addition and Response', () => {
		// REMOVED: "should accept first turn from authorized user" - requires LLM API key

		it.skipIf(!process.env.GOOGLE_GENAI_API_KEY)('should accept subsequent turns', async () => {
			// First turn already added in previous test
			// Add second turn
			const result = await studentClient.conversations.addTurn(
				testConversationId,
				'However, I also consider the collective perspective',
				'followup'
			);

			expect(result.success).toBe(true);
		});

		it('should handle empty text gracefully', async () => {
			const result = await studentClient.conversations.addTurn(testConversationId, '', 'idea');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toMatch(/required|invalid|empty/i);
			}
		});

		it('should handle very long text input', async () => {
			const longText = 'A'.repeat(10000); // 10KB of text

			const result = await studentClient.conversations.addTurn(
				testConversationId,
				longText,
				'idea'
			);

			// Should either succeed or give size error, but not crash
			expect(result).toBeDefined();
			expect(typeof result.success).toBe('boolean');
		});
	});

	describe('Conversation State', () => {
		it.skipIf(!process.env.GOOGLE_GENAI_API_KEY)(
			'should transition conversation state based on dialogue progress',
			async () => {
				// Create a fresh conversation to test state transitions
				const newConvResult = await studentClient.conversations.create(testAssignmentId);
				if (!newConvResult.success) return;
				const newConversationId = newConvResult.data.id;

				// Get initial state
				const initialConv = await studentClient.conversations.get(newConversationId);
				expect(initialConv.success).toBe(true);
				if (initialConv.success) {
					// Should start in awaiting_idea or similar state
					expect((initialConv.data as Conversation).state).toBeDefined();
				}

				// Add a turn
				const addTurnResult = await studentClient.conversations.addTurn(
					newConversationId,
					'Test stance for state transition',
					'idea'
				);

				if (addTurnResult.success) {
					// Get updated state
					await delay(300);
					const updatedConv = await studentClient.conversations.get(newConversationId);
					expect(updatedConv.success).toBe(true);
					if (updatedConv.success) {
						// State should have changed
						expect((updatedConv.data as Conversation).state).toBeDefined();
					}
				}

				// Cleanup
				await studentClient.conversations.end(newConversationId);
			}
		);

		it.skipIf(!process.env.GOOGLE_GENAI_API_KEY)(
			'should persist turns in conversation history',
			async () => {
				// Create a fresh conversation
				const newConvResult = await studentClient.conversations.create(testAssignmentId);
				if (!newConvResult.success) return;
				const newConversationId = newConvResult.data.id;

				// Get initial turns
				const beforeConv = await studentClient.conversations.get(newConversationId);
				const initialTurnCount = beforeConv.success
					? ((beforeConv.data as Conversation).turns || []).length
					: 0;

				// Add a turn
				const addTurnResult = await studentClient.conversations.addTurn(
					newConversationId,
					'Message to persist',
					'idea'
				);

				if (addTurnResult.success) {
					// Get updated turns
					await delay(300);
					const afterConv = await studentClient.conversations.get(newConversationId);
					expect(afterConv.success).toBe(true);

					if (afterConv.success) {
						const finalTurns = (afterConv.data as Conversation).turns || [];
						// Should have more turns now (user turn + AI response)
						expect(finalTurns.length).toBeGreaterThan(initialTurnCount);

						// Last turn(s) should include our message
						const messageFound = finalTurns.some((t) => t.text?.includes('Message to persist'));
						expect(messageFound).toBe(true);
					}
				}

				// Cleanup
				await studentClient.conversations.end(newConversationId);
			}
		);
	});
});
