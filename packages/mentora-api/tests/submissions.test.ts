/**
 * Integration Tests for submission operations
 *
 * Tests the submissions module against real Firebase
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTeacherClient, teardownAllClients, generateTestId, delay } from './emulator-setup.js';
import type { MentoraClient } from '../src/lib/api/client.js';

describe('Submissions Module (Integration)', () => {
	let client: MentoraClient;
	let testCourseId: string | null = null;
	let testAssignmentId: string | null = null;

	beforeAll(async () => {
		client = await setupTeacherClient();

		// Create a test course and assignment for submission tests
		const courseResult = await client.courses.create(
			`Test Course for Submissions ${generateTestId()}`,
			`TS${Date.now().toString().slice(-6)}`,
			{ visibility: 'private' }
		);
		if (courseResult.success) {
			testCourseId = courseResult.data;

			const assignmentResult = await client.assignments.create({
				courseId: testCourseId,
				topicId: null,
				orderInTopic: null,
				title: `Test Assignment for Submissions ${generateTestId()}`,
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

	describe('startSubmission()', () => {
		it('should start a new submission', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const result = await client.submissions.start(testAssignmentId);

			expect(result.success).toBe(true);
		});
	});

	describe('getMySubmission()', () => {
		it('should get current user submission', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no test assignment created');
				return;
			}

			await delay(500);

			const result = await client.submissions.getMine(testAssignmentId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBeDefined();
			}
		});
	});

	describe('listAssignmentSubmissions()', () => {
		it('should list submissions for an assignment', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const result = await client.submissions.listForAssignment(testAssignmentId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
			}
		});
	});

	describe('submitAssignment()', () => {
		it('should submit assignment', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const result = await client.submissions.submit(testAssignmentId);

			expect(result.success).toBe(true);
		});
	});

	describe('getSubmission()', () => {
		it('should get submission by assignment and user ID', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no test assignment created');
				return;
			}

			// Get our own submission
			const mySubmission = await client.submissions.getMine(testAssignmentId);
			if (!mySubmission.success || !mySubmission.data) {
				console.log('Skipping - no submission found');
				return;
			}

			const userId = (mySubmission.data as { userId?: string }).userId;
			if (!userId) {
				console.log('Skipping - no userId in submission');
				return;
			}

			const result = await client.submissions.get(testAssignmentId, userId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBeDefined();
			}
		});

		it('should fail for non-existent submission', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const result = await client.submissions.get(testAssignmentId, 'non-existent-user-id');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeDefined();
			}
		});
	});

	describe('gradeSubmission()', () => {
		it('should grade submission', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no test assignment created');
				return;
			}

			// Get our own submission
			const mySubmission = await client.submissions.getMine(testAssignmentId);
			if (!mySubmission.success || !mySubmission.data) {
				console.log('Skipping - no submission found');
				return;
			}

			const userId = (mySubmission.data as { userId?: string }).userId;
			if (!userId) {
				console.log('Skipping - no userId in submission');
				return;
			}

			const result = await client.submissions.grade(testAssignmentId, userId, {
				scoreCompletion: 85,
				notes: 'Good work!'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.scoreCompletion).toBe(85);
			}
		});
	});
});
