/**
 * Integration Tests for topic operations
 *
 * Tests the topics module against real Firebase
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTeacherClient, teardownAllClients, generateTestId, delay } from './emulator-setup.js';
import type { MentoraClient } from '../src/lib/api/client.js';

describe('Topics Module (Integration)', () => {
	let client: MentoraClient;
	let testCourseId: string | null = null;
	let testTopicId: string | null = null;

	beforeAll(async () => {
		client = await setupTeacherClient();

		// Create a test course for topic tests
		const courseResult = await client.courses.create(
			`Test Course for Topics ${generateTestId()}`,
			`TT${Date.now().toString().slice(-6)}`,
			{ visibility: 'private' }
		);
		if (courseResult.success) {
			testCourseId = courseResult.data;
		}

		expect(testCourseId, 'testCourseId should be created in beforeAll').toBeTruthy();
	});

	afterAll(async () => {
		// Clean up test topic
		if (testTopicId && testCourseId) {
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

	describe('createTopic()', () => {
		it('should create a new topic', async () => {
			expect(testCourseId, 'testCourseId should be set by setup').toBeTruthy();

			const result = await client.topics.create({
				courseId: testCourseId!,
				title: `Test Topic ${generateTestId()}`,
				description: 'Integration test topic',
				order: null,
				contents: [],
				contentTypes: []
			});
			expect(result.success).toBe(true);
			if (result.success) {
				testTopicId = result.data;
				expect(testTopicId).toBeDefined();
			}
		});
	});

	describe('getTopic()', () => {
		it('should get topic by ID', async () => {
			expect(testTopicId, 'testTopicId should be set by prior test').toBeTruthy();

			await delay(500);

			const result = await client.topics.get(testTopicId!);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(testTopicId);
				expect(result.data.title).toContain('Test Topic');
			}
		});

		it('should return failure for non-existent topic', async () => {
			const result = await client.topics.get('non-existent-topic-id-12345');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Topic not found');
			}
		});
	});

	describe('listCourseTopics()', () => {
		it('should list topics for a course', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test/setup').toBeTruthy();

			const result = await client.topics.listForCourse(testCourseId!);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
				if (testTopicId) {
					const found = result.data.some((t) => t.id === testTopicId);
					expect(found).toBe(true);
				}
			}
		});
	});

	describe('updateTopic()', () => {
		it('should update topic', async () => {
			expect(testTopicId, 'testTopicId should be set by prior test').toBeTruthy();

			const newTitle = `Updated Topic ${Date.now()}`;
			const result = await client.topics.update(testTopicId!, {
				title: newTitle
			});

			expect(result.success).toBe(true);
		});
	});

	describe('deleteTopic()', () => {
		it('should delete topic', async () => {
			expect(testTopicId, 'testTopicId should be set by prior test').toBeTruthy();

			const result = await client.topics.delete(testTopicId!);

			expect(result.success).toBe(true);
			testTopicId = null;
		});
	});
});
