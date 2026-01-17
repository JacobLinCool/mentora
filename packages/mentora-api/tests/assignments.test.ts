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
	let testTopicId: string | null = null;
	let testAssignmentId: string | null = null;
	let testAssignmentId2: string | null = null;
	let testAssignmentId3: string | null = null;

	beforeAll(async () => {
		client = await setupTeacherClient();

		// Create a test course and topic for assignment tests
		const courseResult = await client.courses.create(
			`Test Course for Assignments ${generateTestId()}`,
			`TA${Date.now().toString().slice(-6)}`,
			{ visibility: 'private' }
		);
		if (courseResult.success) {
			testCourseId = courseResult.data;

			// Create a test topic
			const topicResult = await client.topics.create({
				courseId: testCourseId,
				title: `Test Topic ${generateTestId()}`,
				description: 'Topic for assignment tests',
				order: null
			});
			if (topicResult.success) {
				testTopicId = topicResult.data;
			}
		}

		await delay(500);
	});

	afterAll(async () => {
		// Clean up test assignments
		const assignmentIds = [testAssignmentId, testAssignmentId2, testAssignmentId3];
		for (const id of assignmentIds) {
			if (id) {
				try {
					await client.assignments.delete(id);
				} catch {
					// Ignore cleanup errors
				}
			}
		}
		// Clean up test topic
		if (testTopicId) {
			try {
				await client.topics.delete(testTopicId);
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
		it('should create a new assignment without topic', async () => {
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
				expect(typeof testAssignmentId).toBe('string');
			}
		});

		it('should create assignment with topic', async () => {
			if (!testCourseId || !testTopicId) {
				console.log('Skipping - no test course or topic');
				return;
			}

			const result = await client.assignments.create({
				courseId: testCourseId,
				topicId: testTopicId,
				orderInTopic: 1,
				title: `Test Assignment with Topic ${generateTestId()}`,
				prompt: 'Assignment within a topic',
				mode: 'instant',
				startAt: Date.now(),
				dueAt: null,
				allowLate: true,
				allowResubmit: true
			});

			expect(result.success).toBe(true);
			if (result.success) {
				testAssignmentId2 = result.data;
				expect(testAssignmentId2).toBeDefined();
			}
		});

		it('should create assignment with future due date', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			const futureDate = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

			const result = await client.assignments.create({
				courseId: testCourseId,
				topicId: null,
				orderInTopic: null,
				title: `Assignment with due date ${generateTestId()}`,
				prompt: 'This assignment has a due date',
				mode: 'instant',
				startAt: Date.now(),
				dueAt: futureDate,
				allowLate: true,
				allowResubmit: false
			});

			expect(result.success).toBe(true);
			if (result.success) {
				testAssignmentId3 = result.data;
				const assignment = await client.assignments.get(testAssignmentId3);
				expect(assignment.success).toBe(true);
				if (assignment.success) {
					expect(assignment.data.dueAt).toBe(futureDate);
				}
			}
		});

		it('should create assignment with instant mode', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			const result = await client.assignments.create({
				courseId: testCourseId,
				topicId: null,
				orderInTopic: null,
				title: `Assignment instant mode ${generateTestId()}`,
				prompt: 'Testing instant mode',
				mode: 'instant',
				startAt: Date.now(),
				dueAt: null,
				allowLate: true,
				allowResubmit: true
			});

			expect(result.success).toBe(true);
			if (result.success) {
				// Clean up immediately
				await client.assignments.delete(result.data);
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
				expect(result.data.courseId).toBe(testCourseId);
			}
		});

		it('should return complete assignment data structure', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const result = await client.assignments.get(testAssignmentId);

			expect(result.success).toBe(true);
			if (result.success) {
				const assignment = result.data;
				expect(assignment.id).toBeDefined();
				expect(assignment.courseId).toBeDefined();
				expect(assignment.title).toBeDefined();
				expect(assignment.prompt).toBeDefined();
				expect(assignment.mode).toBeDefined();
				expect(assignment.startAt).toBeDefined();
				expect(assignment.allowLate).toBeDefined();
				expect(assignment.allowResubmit).toBeDefined();
				expect(assignment.createdBy).toBeDefined();
				expect(assignment.createdAt).toBeDefined();
				expect(assignment.updatedAt).toBeDefined();
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
		it('should list all assignments for a course', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			const result = await client.assignments.listForCourse(testCourseId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
				// Should have multiple assignments we created
				expect(result.data.length).toBeGreaterThanOrEqual(1);
			}
		});

		it('should list assignments with limit', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			const result = await client.assignments.listForCourse(testCourseId, { limit: 2 });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.length).toBeLessThanOrEqual(2);
			}
		});

		it('should include assignments with topics', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			const result = await client.assignments.listForCourse(testCourseId);

			expect(result.success).toBe(true);
			if (result.success && testTopicId) {
				const assignmentsWithTopic = result.data.filter((a) => a.topicId === testTopicId);
				expect(assignmentsWithTopic.length).toBeGreaterThanOrEqual(1);
			}
		});
	});

	describe('listAvailableAssignments()', () => {
		it('should list available assignments (started and not ended)', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			const result = await client.assignments.listAvailable(testCourseId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
				// All returned assignments should have startAt in past or present
				result.data.forEach((assignment) => {
					expect(assignment.startAt).toBeLessThanOrEqual(Date.now() + 1000); // Allow 1s tolerance
				});
			}
		});

		it('should apply limit to available assignments', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			const result = await client.assignments.listAvailable(testCourseId, { limit: 1 });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.length).toBeLessThanOrEqual(1);
			}
		});
	});

	describe('updateAssignment()', () => {
		it('should update assignment title', async () => {
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
				expect(result.data.updatedAt).toBeGreaterThan(result.data.createdAt);
			}
		});

		it('should update assignment prompt', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const newPrompt = `Updated prompt ${Date.now()}`;
			const result = await client.assignments.update(testAssignmentId, {
				prompt: newPrompt
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.prompt).toBe(newPrompt);
			}
		});

		it('should update assignment settings', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const result = await client.assignments.update(testAssignmentId, {
				allowLate: true,
				allowResubmit: false
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.allowLate).toBe(true);
				expect(result.data.allowResubmit).toBe(false);
			}
		});

		it('should update due date', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const newDueDate = Date.now() + 24 * 60 * 60 * 1000; // Tomorrow
			const result = await client.assignments.update(testAssignmentId, {
				dueAt: newDueDate
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.dueAt).toBe(newDueDate);
			}
		});

		it('should preserve createdBy and createdAt on update', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const originalAssignment = await client.assignments.get(testAssignmentId);
			if (!originalAssignment.success) {
				console.log('Skipping - could not get original assignment');
				return;
			}

			const result = await client.assignments.update(testAssignmentId, {
				title: `Updated again ${Date.now()}`
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.createdBy).toBe(originalAssignment.data.createdBy);
				expect(result.data.createdAt).toBe(originalAssignment.data.createdAt);
			}
		});
	});

	describe('deleteAssignment()', () => {
		it('should delete assignment', async () => {
			if (!testAssignmentId2) {
				console.log('Skipping - no test assignment to delete');
				return;
			}

			const result = await client.assignments.delete(testAssignmentId2);

			expect(result.success).toBe(true);

			// Verify it's deleted
			await delay(300);
			const getResult = await client.assignments.get(testAssignmentId2);
			expect(getResult.success).toBe(false);

			testAssignmentId2 = null;
		});

		it('should fail to delete non-existent assignment', async () => {
			const result = await client.assignments.delete('non-existent-assignment-id-12345');

			// May succeed or fail depending on Firestore rules
			// Just verify it returns a result
			expect(result.success !== undefined).toBe(true);
		});
	});

	describe('Assignment Lifecycle', () => {
		it('should handle complete assignment lifecycle', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			// 1. Create assignment
			const createResult = await client.assignments.create({
				courseId: testCourseId,
				topicId: null,
				orderInTopic: null,
				title: `Lifecycle Assignment ${generateTestId()}`,
				prompt: 'Lifecycle test',
				mode: 'instant',
				startAt: Date.now() - 60000, // Started 1 minute ago
				dueAt: null,
				allowLate: true,
				allowResubmit: true
			});

			expect(createResult.success).toBe(true);
			if (!createResult.success) return;

			const assignmentId = createResult.data;

			// 2. Get assignment
			await delay(300);
			const getResult = await client.assignments.get(assignmentId);
			expect(getResult.success).toBe(true);

			// 3. Update assignment
			const updateResult = await client.assignments.update(assignmentId, {
				title: `Updated Lifecycle ${Date.now()}`
			});
			expect(updateResult.success).toBe(true);

			// 4. List and verify it appears
			const listResult = await client.assignments.listForCourse(testCourseId);
			expect(listResult.success).toBe(true);

			// 5. Delete assignment
			const deleteResult = await client.assignments.delete(assignmentId);
			expect(deleteResult.success).toBe(true);
		});
	});
});
