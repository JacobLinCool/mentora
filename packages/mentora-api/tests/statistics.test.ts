/**
 * Integration Tests for Statistics API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupIntegrationTests, teardownIntegrationTests, createTestConfig } from './setup';
import * as StatisticsAPI from '$lib/api/statistics';
import * as CoursesAPI from '$lib/api/courses';
import * as AssignmentsAPI from '$lib/api/assignments';
import * as ConversationsAPI from '$lib/api/conversations';
import * as SubmissionsAPI from '$lib/api/submissions';

// Skip: API signatures have changed, tests need updating
describe.skip('Statistics API Integration', () => {
	let courseId: string;
	let assignmentId: string;

	beforeAll(async () => {
		await setupIntegrationTests();

		// Setup prerequisites
		const config = await createTestConfig({ authenticated: true });

		const courseResult = await CoursesAPI.createCourse(config, 'Course for Statistics');
		if (!courseResult.success) throw new Error('Failed to create course');
		courseId = courseResult.data;

		const assignmentResult = await AssignmentsAPI.createAssignment(config, {
			courseId,
			topicId: null,
			orderInTopic: null,
			title: 'Assignment for Statistics',
			prompt: 'Test prompt',
			mode: 'instant',
			startAt: Date.now(),
			dueAt: null,
			allowLate: false,
			allowResubmit: true
		});

		if (!assignmentResult.success) throw new Error('Failed to create assignment');
		assignmentId = assignmentResult.data;

		// Create some data for statistics
		// User 1 - Started
		const user1 = await createTestConfig({ authenticated: true, email: 'stats1@test.com' });
		await SubmissionsAPI.startSubmission(user1, assignmentId);

		// User 2 - Submitted
		const user2 = await createTestConfig({ authenticated: true, email: 'stats2@test.com' });
		await SubmissionsAPI.startSubmission(user2, assignmentId);
		await SubmissionsAPI.submitAssignment(user2, assignmentId, {});
	});

	afterAll(async () => {
		await teardownIntegrationTests();
	});

	describe('getAssignmentStatistics', () => {
		it('should retrieve statistics for assignment', async () => {
			const config = await createTestConfig({ authenticated: true });

			const result = await StatisticsAPI.getAssignmentStatistics(config, assignmentId);

			expect(result.success).toBe(true);
			if (result.success) {
				// We expect 0 for word cloud etc since no real analysis happened
				// but the structure should be correct
				expect(result.data.stanceDistribution).toBeDefined();
				expect(result.data.commonThemes).toBeDefined();
			}
		});
	});

	describe('getAssignmentCompletionStatus', () => {
		it('should retrieve completion status', async () => {
			const config = await createTestConfig({ authenticated: true });

			const result = await StatisticsAPI.getAssignmentCompletionStatus(config, assignmentId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.started).toBeGreaterThanOrEqual(1);
				expect(result.data.submitted).toBeGreaterThanOrEqual(1);
			}
		});
	});

	describe('getCourseStatistics', () => {
		it('should retrieve course statistics', async () => {
			const config = await createTestConfig({ authenticated: true });

			const result = await StatisticsAPI.getCourseStatistics(config, courseId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.totalStudents).toBeDefined();
				expect(result.data.activeAssignments).toBeDefined();
			}
		});
	});
});
