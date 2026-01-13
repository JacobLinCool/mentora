/**
 * Integration Tests for course management operations
 *
 * Tests the courses module against real Firebase
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTeacherClient, teardownAllClients, generateTestId, delay } from './emulator-setup.js';
import type { MentoraClient } from '../src/lib/api/client.js';

describe('Courses Module (Integration)', () => {
	let client: MentoraClient;
	let testCourseId: string | null = null;

	beforeAll(async () => {
		client = await setupTeacherClient();
	});

	afterAll(async () => {
		// Clean up test course if created
		if (testCourseId) {
			try {
				await client.courses.delete(testCourseId);
			} catch {
				// Ignore cleanup errors
			}
		}
		await teardownAllClients();
	});

	describe('createCourse()', () => {
		it('should create a new course', async () => {
			const testTitle = `Test Course ${generateTestId()}`;
			const testCode = `TC${Date.now().toString().slice(-6)}`;

			const result = await client.courses.create(testTitle, testCode, {
				visibility: 'private',
				description: 'Integration test course'
			});

			if (!result.success) {
				console.error('createCourse failed:', JSON.stringify(result));
			}
			expect(result.success).toBe(true);
			if (result.success) {
				testCourseId = result.data;
				expect(testCourseId).toBeDefined();
				expect(typeof testCourseId).toBe('string');
			}
		});
	});

	describe('getCourse()', () => {
		it('should get course by ID', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			// Small delay for eventual consistency
			await delay(500);

			const result = await client.courses.get(testCourseId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(testCourseId);
				expect(result.data.title).toContain('Test Course');
			}
		});

		it('should return failure for non-existent course', async () => {
			const result = await client.courses.get('non-existent-course-id-12345');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Course not found');
			}
		});
	});

	describe('listMyCourses()', () => {
		it('should list courses owned by current user', async () => {
			const result = await client.courses.listMine();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
				// Should include our test course if created
				if (testCourseId) {
					const found = result.data.some((c) => c.id === testCourseId);
					expect(found).toBe(true);
				}
			}
		});

		it('should apply limit option', async () => {
			const result = await client.courses.listMine({ limit: 1 });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.length).toBeLessThanOrEqual(1);
			}
		});
	});

	describe('updateCourse()', () => {
		it('should update course', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			const newTitle = `Updated Test Course ${Date.now()}`;
			const result = await client.courses.update(testCourseId, {
				title: newTitle
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.title).toBe(newTitle);
			}
		});
	});

	describe('getCourseRoster()', () => {
		it('should get course roster', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			const result = await client.courses.getRoster(testCourseId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
				// Owner should be in roster
				expect(result.data.length).toBeGreaterThanOrEqual(1);
			}
		});
	});

	describe('listPublicCourses()', () => {
		it('should list public courses', async () => {
			const result = await client.courses.listPublic({ limit: 5 });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
			}
		});
	});

	describe('listEnrolled()', () => {
		it('should list enrolled courses', async () => {
			const result = await client.courses.listEnrolled({ limit: 10 });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
			}
		});
	});

	describe('listAllEnrolled()', () => {
		it('should list all enrolled courses', async () => {
			const result = await client.courses.listAllEnrolled({ limit: 10 });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
			}
		});
	});

	describe('inviteMember()', () => {
		it('should invite a member to course', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			const testEmail = `test-invite-${Date.now()}@example.com`;
			const result = await client.courses.inviteMember(testCourseId, testEmail, 'student');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBeDefined();
			}
		});
	});

	describe('updateMember()', () => {
		it('should update member role', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			// Get roster to find a member
			const rosterResult = await client.courses.getRoster(testCourseId);
			if (!rosterResult.success || rosterResult.data.length === 0) {
				console.log('Skipping - no roster members found');
				return;
			}

			// Try to update first member that is not owner
			const member = rosterResult.data.find((m) => m.role !== 'instructor');
			if (!member || !member.userId) {
				console.log('Skipping - no non-instructor member found');
				return;
			}

			const result = await client.courses.updateMember(testCourseId, member.userId, {
				role: 'ta'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.role).toBe('ta');
			}
		});
	});

	describe('joinByCode()', () => {
		it('should handle join by code', async () => {
			// Try with a non-existent code
			const result = await client.courses.joinByCode('INVALID-CODE-12345');

			// Should fail with not found
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeDefined();
			}
		});
	});

	describe('deleteCourse()', () => {
		it('should delete course', async () => {
			if (!testCourseId) {
				console.log('Skipping - no test course created');
				return;
			}

			const result = await client.courses.delete(testCourseId);

			expect(result.success).toBe(true);
			testCourseId = null; // Mark as deleted
		});
	});
});
