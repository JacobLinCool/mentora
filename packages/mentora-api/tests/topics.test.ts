/**
 * Integration Tests for Topics API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupIntegrationTests, teardownIntegrationTests, createTestConfig } from './setup';
import * as TopicsAPI from '$lib/api/topics';
import * as CoursesAPI from '$lib/api/courses';

describe('Topics API Integration', () => {
	const testEmail = `topics-test-user@example.com`;

	beforeAll(async () => {
		await setupIntegrationTests();
	});

	afterAll(async () => {
		await teardownIntegrationTests();
	});

	describe('createTopic', () => {
		it('should create a topic when authenticated', async () => {
			// Use the same config for all operations
			const config = await createTestConfig({ authenticated: true, email: testEmail });

			const currentUser = config.getCurrentUser();
			console.log('[DEBUG] Current user:', currentUser?.uid, currentUser?.email);

			// First create a course (via backend API)
			const courseResult = await CoursesAPI.createCourse(config, 'Course for Topic Test');
			console.log(
				'[DEBUG] Course result:',
				courseResult.success,
				courseResult.success ? courseResult.data : courseResult.error
			);

			expect(courseResult.success).toBe(true);
			if (!courseResult.success) return;

			const courseId = courseResult.data;

			// Now create a topic in that course
			const result = await TopicsAPI.createTopic(config, {
				courseId,
				title: 'Test Topic',
				description: 'A test topic',
				order: 1
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(typeof result.data).toBe('string');
			}
		});

		it('should fail when not authenticated', async () => {
			const config = await createTestConfig({ authenticated: false });

			const result = await TopicsAPI.createTopic(config, {
				courseId: 'some-course-id',
				title: 'Test Topic',
				description: 'Test',
				order: 1
			});

			expect(result.success).toBe(false);
		});
	});

	describe('getTopic', () => {
		it('should retrieve a topic by ID', async () => {
			const config = await createTestConfig({ authenticated: true, email: testEmail });

			// Create course first
			const courseResult = await CoursesAPI.createCourse(config, 'Course for Get Topic');
			expect(courseResult.success).toBe(true);
			if (!courseResult.success) return;

			// Create topic
			const createResult = await TopicsAPI.createTopic(config, {
				courseId: courseResult.data,
				title: 'Retrievable Topic',
				description: 'Test',
				order: 2
			});

			expect(createResult.success).toBe(true);
			if (!createResult.success) return;

			// Get the topic
			const getResult = await TopicsAPI.getTopic(config, createResult.data);

			expect(getResult.success).toBe(true);
			if (getResult.success) {
				expect(getResult.data.title).toBe('Retrievable Topic');
			}
		});
	});

	describe('listCourseTopics', () => {
		it('should list topics for a course', async () => {
			const config = await createTestConfig({ authenticated: true, email: testEmail });

			// Create course first
			const courseResult = await CoursesAPI.createCourse(config, 'Course for List Topics');
			expect(courseResult.success).toBe(true);
			if (!courseResult.success) return;

			const courseId = courseResult.data;

			// Create a topic so we have something to list
			await TopicsAPI.createTopic(config, {
				courseId,
				title: 'Topic to List',
				description: 'Test',
				order: 1
			});

			const result = await TopicsAPI.listCourseTopics(config, courseId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
			}
		});
	});

	describe('updateTopic', () => {
		it('should update a topic', async () => {
			const config = await createTestConfig({ authenticated: true, email: testEmail });

			// Create course first
			const courseResult = await CoursesAPI.createCourse(config, 'Course for Update Topic');
			expect(courseResult.success).toBe(true);
			if (!courseResult.success) return;

			// Create topic
			const createResult = await TopicsAPI.createTopic(config, {
				courseId: courseResult.data,
				title: 'Original Topic',
				description: 'Original description',
				order: 3
			});

			expect(createResult.success).toBe(true);
			if (!createResult.success) return;

			// Update it
			const updateResult = await TopicsAPI.updateTopic(config, createResult.data, {
				title: 'Updated Topic'
			});

			expect(updateResult.success).toBe(true);
		});
	});

	describe('deleteTopic', () => {
		it('should delete a topic', async () => {
			const config = await createTestConfig({ authenticated: true, email: testEmail });

			// Create course first
			const courseResult = await CoursesAPI.createCourse(config, 'Course for Delete Topic');
			expect(courseResult.success).toBe(true);
			if (!courseResult.success) return;

			// Create topic
			const createResult = await TopicsAPI.createTopic(config, {
				courseId: courseResult.data,
				title: 'To Delete',
				description: 'Will be deleted',
				order: 4
			});

			expect(createResult.success).toBe(true);
			if (!createResult.success) return;

			// Delete it
			const deleteResult = await TopicsAPI.deleteTopic(config, createResult.data);
			expect(deleteResult.success).toBe(true);

			// Verify deletion
			const getResult = await TopicsAPI.getTopic(config, createResult.data);
			expect(getResult.success).toBe(false);
		});
	});
});
