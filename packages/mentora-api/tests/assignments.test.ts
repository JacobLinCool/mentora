/**
 * Integration Tests for assignment operations
 *
 * Tests the assignments module against real Firebase
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTeacherClient, teardownAllClients, generateTestId, delay } from './emulator-setup.js';
import type { MentoraClient } from '../src/lib/api/client.js';

describe('Assignments Module (Integration)', () => {
	let client: MentoraClient;
	let testCourseId: string | null = null;
	let testAssignmentId: string | null = null;

	beforeAll(async () => {
		client = await setupTeacherClient();

		// Create a test course for assignment tests
		const courseResult = await client.courses.create(
			`Test Course for Assignments ${generateTestId()}`,
			`TA${Date.now().toString().slice(-6)}`,
			{ visibility: 'private' }
		);
		if (courseResult.success) {
			testCourseId = courseResult.data;
		}
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

	describe('createAssignment()', () => {
		it('should create a new assignment', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			const result = await client.assignments.create({
				courseId: testCourseId,
				topicId: null,
				orderInTopic: null,
				title: `Test Assignment ${generateTestId()}`,
				prompt: 'Integration test prompt',
				mode: 'instant',
				startAt: Date.now(),
				dueAt: null,
				allowLate: false,
				allowResubmit: true
			});

			expect(result.success).toBe(true);
			if (result.success) {
				testAssignmentId = result.data;
				expect(testAssignmentId).toBeDefined();
			}
		});
	});

	describe('getAssignment()', () => {
		it('should get assignment by ID', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no test assignment created');
				return;
			}

			await delay(500);

			const result = await client.assignments.get(testAssignmentId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(testAssignmentId);
				expect(result.data.title).toContain('Test Assignment');
			}
		});

		it('should return failure for non-existent assignment', async () => {
			const result = await client.assignments.get('non-existent-assignment-id-12345');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Assignment not found');
			}
		});
	});

	describe('listCourseAssignments()', () => {
		it('should list assignments for a course', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			const result = await client.assignments.listForCourse(testCourseId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
				if (testAssignmentId) {
					const found = result.data.some((a) => a.id === testAssignmentId);
					expect(found).toBe(true);
				}
			}
		});
	});

	describe('listAvailableAssignments()', () => {
		it('should list available assignments', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			const result = await client.assignments.listAvailable(testCourseId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
			}
		});
	});

	describe('updateAssignment()', () => {
		it('should update assignment', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const newTitle = `Updated Assignment ${Date.now()}`;
			const result = await client.assignments.update(testAssignmentId, {
				title: newTitle
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.title).toBe(newTitle);
			}
		});
	});

	describe('deleteAssignment()', () => {
		it('should delete assignment', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const result = await client.assignments.delete(testAssignmentId);

			expect(result.success).toBe(true);
			testAssignmentId = null;
		});
	});
});
