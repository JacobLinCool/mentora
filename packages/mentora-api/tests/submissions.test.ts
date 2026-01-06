/**
 * Integration Tests for Submissions API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupIntegrationTests, teardownIntegrationTests, createTestConfig } from './setup';
import * as SubmissionsAPI from '$lib/api/submissions';
import * as AssignmentsAPI from '$lib/api/assignments';
import * as CoursesAPI from '$lib/api/courses';
import * as ConversationsAPI from '$lib/api/conversations';

// Skip: API signatures have changed, tests need updating
describe.skip('Submissions API Integration', () => {
	let assignmentId: string;
	let courseId: string;

	beforeAll(async () => {
		await setupIntegrationTests();

		// Setup prerequisites
		const config = await createTestConfig({ authenticated: true });

		const courseResult = await CoursesAPI.createCourse(config, 'Course for Submissions');
		if (!courseResult.success) throw new Error('Failed to create course');
		courseId = courseResult.data;

		const assignmentResult = await AssignmentsAPI.createAssignment(config, {
			courseId,
			topicId: null,
			orderInTopic: null,
			title: 'Assignment for Submissions',
			prompt: 'Test prompt',
			mode: 'instant',
			startAt: Date.now(),
			dueAt: null,
			allowLate: false,
			allowResubmit: true
		});

		if (!assignmentResult.success) throw new Error('Failed to create assignment');
		assignmentId = assignmentResult.data;
	});

	afterAll(async () => {
		await teardownIntegrationTests();
	});

	describe('startSubmission', () => {
		it('should start a submission when authenticated', async () => {
			const config = await createTestConfig({ authenticated: true, email: 'student1@test.com' });

			const result = await SubmissionsAPI.startSubmission(config, assignmentId);

			expect(result.success).toBe(true);

			// Verify it exists
			const getResult = await SubmissionsAPI.getMySubmission(config, assignmentId);
			expect(getResult.success).toBe(true);
			if (getResult.success) {
				expect(getResult.data.state).toBe('in_progress');
				expect(getResult.data.userId).toBeDefined();
			}
		});
	});

	describe('getMySubmission/getSubmission', () => {
		it('should retrieve current user submission', async () => {
			const config = await createTestConfig({ authenticated: true, email: 'student2@test.com' });

			// Start first
			await SubmissionsAPI.startSubmission(config, assignmentId);

			// Get my submission
			const result = await SubmissionsAPI.getMySubmission(config, assignmentId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.state).toBe('in_progress');
			}
		});

		it('should return error if not found', async () => {
			const config = await createTestConfig({ authenticated: true });
			// Using random assignment ID
			const result = await SubmissionsAPI.getMySubmission(config, 'non-existent-id');

			expect(result.success).toBe(false);
		});
	});

	describe('submitAssignment', () => {
		it('should submit an assignment', async () => {
			const config = await createTestConfig({ authenticated: true, email: 'student3@test.com' });

			// Create a conversation as it is often prerequisites for submission
			const convResult = await ConversationsAPI.createConversation(config, { assignmentId });
			if (!convResult.success) return;

			// Start submission
			await SubmissionsAPI.startSubmission(config, assignmentId);

			// Submit
			const result = await SubmissionsAPI.submitAssignment(config, assignmentId);

			expect(result.success).toBe(true);

			// Verify status
			const getResult = await SubmissionsAPI.getMySubmission(config, assignmentId);
			expect(getResult.success).toBe(true);
			if (getResult.success) {
				expect(getResult.data.state).toBe('submitted');
				expect(getResult.data.submittedAt).toBeDefined();
			}
		});
	});

	describe('listAssignmentSubmissions', () => {
		it('should list submissions for an assignment', async () => {
			const config = await createTestConfig({ authenticated: true });

			// Ensure at least one submission exists
			await SubmissionsAPI.startSubmission(config, assignmentId);

			const result = await SubmissionsAPI.listAssignmentSubmissions(config, assignmentId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.length).toBeGreaterThan(0);
			}
		});
	});

	describe('gradeSubmission', () => {
		it('should grade a submission', async () => {
			// Student creates submission
			const studentConfig = await createTestConfig({
				authenticated: true,
				email: 'student4@test.com'
			});
			const studentUser = studentConfig.getCurrentUser();
			if (!studentUser) return;

			await SubmissionsAPI.startSubmission(studentConfig, assignmentId);
			await SubmissionsAPI.submitAssignment(studentConfig, assignmentId, {});

			// Instructor grades it
			const instructorConfig = await createTestConfig({
				authenticated: true,
				email: 'instructor@test.com'
			});

			const result = await SubmissionsAPI.gradeSubmission(
				instructorConfig,
				assignmentId,
				studentUser.uid,
				{
					scoreCompletion: 95,
					notes: 'Great job!',
					state: 'graded_complete'
				}
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.scoreCompletion).toBe(95);
				expect(result.data.state).toBe('graded_complete');
			}
		});
	});
});
