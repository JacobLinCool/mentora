/**
 * Integration Tests for Assignments API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupIntegrationTests, teardownIntegrationTests, createTestConfig } from './setup';
import * as AssignmentsAPI from '$lib/api/assignments';
import * as CoursesAPI from '$lib/api/courses';

describe('Assignments API Integration', () => {
	const testEmail = `assignments-test-user@example.com`;

	beforeAll(async () => {
		await setupIntegrationTests();
	});

	afterAll(async () => {
		await teardownIntegrationTests();
	});

	describe('createAssignment', () => {
		it('should create an assignment when authenticated', async () => {
			const config = await createTestConfig({ authenticated: true, email: testEmail });

			// First create a course
			const courseResult = await CoursesAPI.createCourse(config, 'Course for Assignment Test');
			expect(courseResult.success).toBe(true);
			if (!courseResult.success) return;

			const result = await AssignmentsAPI.createAssignment(config, {
				courseId: courseResult.data,
				topicId: null,
				orderInTopic: null,
				title: 'Test Assignment',
				prompt: 'This is a test assignment prompt',
				mode: 'instant',
				startAt: Date.now(),
				dueAt: Date.now() + 86400000,
				allowLate: false,
				allowResubmit: false
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(typeof result.data).toBe('string');
			}
		});

		it('should fail when not authenticated', async () => {
			const config = await createTestConfig({ authenticated: false });

			const result = await AssignmentsAPI.createAssignment(config, {
				courseId: 'some-course-id',
				topicId: null,
				orderInTopic: null,
				title: 'Test',
				prompt: 'Test prompt',
				mode: 'instant',
				startAt: Date.now(),
				dueAt: null,
				allowLate: false,
				allowResubmit: false
			});

			expect(result.success).toBe(false);
		});
	});

	describe('getAssignment', () => {
		it('should retrieve an assignment by ID', async () => {
			const config = await createTestConfig({ authenticated: true, email: testEmail });

			// Create course first
			const courseResult = await CoursesAPI.createCourse(config, 'Course for Get Assignment');
			expect(courseResult.success).toBe(true);
			if (!courseResult.success) return;

			// Create assignment
			const createResult = await AssignmentsAPI.createAssignment(config, {
				courseId: courseResult.data,
				topicId: null,
				orderInTopic: null,
				title: 'Retrievable Assignment',
				prompt: 'Test prompt',
				mode: 'instant',
				startAt: Date.now(),
				dueAt: null,
				allowLate: false,
				allowResubmit: false
			});

			expect(createResult.success).toBe(true);
			if (!createResult.success) return;

			// Get the assignment
			const getResult = await AssignmentsAPI.getAssignment(config, createResult.data);

			expect(getResult.success).toBe(true);
			if (getResult.success) {
				expect(getResult.data.title).toBe('Retrievable Assignment');
			}
		});
	});

	describe('listCourseAssignments', () => {
		it('should list assignments for a course', async () => {
			const config = await createTestConfig({ authenticated: true, email: testEmail });

			// Create course first
			const courseResult = await CoursesAPI.createCourse(config, 'Course for List Assignments');
			expect(courseResult.success).toBe(true);
			if (!courseResult.success) return;

			const courseId = courseResult.data;

			// Create an assignment so we have something to list
			await AssignmentsAPI.createAssignment(config, {
				courseId,
				topicId: null,
				orderInTopic: null,
				title: 'Assignment to List',
				prompt: 'Test prompt',
				mode: 'instant',
				startAt: Date.now(),
				dueAt: null,
				allowLate: false,
				allowResubmit: false
			});

			const result = await AssignmentsAPI.listCourseAssignments(config, courseId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
			}
		});
	});

	describe('updateAssignment', () => {
		it('should update an assignment', async () => {
			const config = await createTestConfig({ authenticated: true, email: testEmail });

			// Create course first
			const courseResult = await CoursesAPI.createCourse(config, 'Course for Update Assignment');
			expect(courseResult.success).toBe(true);
			if (!courseResult.success) return;

			// Create assignment
			const createResult = await AssignmentsAPI.createAssignment(config, {
				courseId: courseResult.data,
				topicId: null,
				orderInTopic: null,
				title: 'Original Assignment',
				prompt: 'Original prompt',
				mode: 'instant',
				startAt: Date.now(),
				dueAt: null,
				allowLate: false,
				allowResubmit: false
			});

			expect(createResult.success).toBe(true);
			if (!createResult.success) return;

			// Update it
			const updateResult = await AssignmentsAPI.updateAssignment(config, createResult.data, {
				title: 'Updated Assignment'
			});

			expect(updateResult.success).toBe(true);
		});
	});

	describe('deleteAssignment', () => {
		it('should delete an assignment', async () => {
			const config = await createTestConfig({ authenticated: true, email: testEmail });

			// Create course first
			const courseResult = await CoursesAPI.createCourse(config, 'Course for Delete Assignment');
			expect(courseResult.success).toBe(true);
			if (!courseResult.success) return;

			// Create assignment
			const createResult = await AssignmentsAPI.createAssignment(config, {
				courseId: courseResult.data,
				topicId: null,
				orderInTopic: null,
				title: 'To Delete',
				prompt: 'Will be deleted',
				mode: 'instant',
				startAt: Date.now(),
				dueAt: null,
				allowLate: false,
				allowResubmit: false
			});

			expect(createResult.success).toBe(true);
			if (!createResult.success) return;

			// Delete it
			const deleteResult = await AssignmentsAPI.deleteAssignment(config, createResult.data);
			expect(deleteResult.success).toBe(true);

			// Verify deletion
			const getResult = await AssignmentsAPI.getAssignment(config, createResult.data);
			expect(getResult.success).toBe(false);
		});
	});
});
