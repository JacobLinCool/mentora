/**
 * Integration Tests for course management operations
 *
 * Tests the courses module against real Firebase
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

describe('Courses Module (Integration)', () => {
	let teacherClient: MentoraClient;
	let studentClient: MentoraClient;
	let testCourseId: string | null = null;
	let testCourseCode: string | null = null;
	let testCourseId2: string | null = null;
	let testCourseId3: string | null = null;

	beforeAll(async () => {
		teacherClient = await setupTeacherClient();
		studentClient = await setupStudentClient();
	});

	afterAll(async () => {
		// Clean up test courses if created
		const courseIds = [testCourseId, testCourseId2, testCourseId3];
		for (const id of courseIds) {
			if (id) {
				try {
					await teacherClient.courses.delete(id);
				} catch {
					// Ignore cleanup errors
				}
			}
		}
		await teardownAllClients();
	});

	describe('createCourse()', () => {
		it('should create a new private course', async () => {
			const testTitle = `Test Course ${generateTestId()}`;
			testCourseCode = `TC${Date.now().toString().slice(-6)}`;

			const result = await teacherClient.courses.create(testTitle, testCourseCode, {
				visibility: 'private',
				description: 'Integration test private course'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				testCourseId = result.data;
				expect(testCourseId).toBeDefined();
				expect(typeof testCourseId).toBe('string');
			}
		});

		it('should create a new unlisted course', async () => {
			const testTitle = `Unlisted Course ${generateTestId()}`;
			const testCode = `UC${Date.now().toString().slice(-6)}`;

			const result = await teacherClient.courses.create(testTitle, testCode, {
				visibility: 'unlisted',
				description: 'Unlisted course for testing'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				testCourseId2 = result.data;
			}
		});

		it('should create a public course', async () => {
			const testTitle = `Public Course ${generateTestId()}`;
			const testCode = `PC${Date.now().toString().slice(-6)}`;

			const result = await teacherClient.courses.create(testTitle, testCode, {
				visibility: 'public',
				description: 'Public course for discovery'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				testCourseId3 = result.data;
			}
		});

		it('should create course with demo settings', async () => {
			const testTitle = `Demo Course ${generateTestId()}`;
			const testCode = `DC${Date.now().toString().slice(-6)}`;

			const result = await teacherClient.courses.create(testTitle, testCode, {
				visibility: 'public',
				isDemo: true,
				demoPolicy: {
					maxFreeCreditsPerUser: 1000,
					maxTurnsPerConversation: 5
				}
			});

			expect(result.success).toBe(true);
			if (result.success) {
				const courseId = result.data;
				// Clean up immediately
				await teacherClient.courses.delete(courseId);
			}
		});

		it('should create course without code', async () => {
			const testTitle = `Course No Code ${generateTestId()}`;

			const result = await teacherClient.courses.create(testTitle, undefined, {
				visibility: 'private'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				const courseId = result.data;
				// Clean up immediately
				await teacherClient.courses.delete(courseId);
			}
		});
	});

	describe('getCourse()', () => {
		it('should get course by ID', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			await delay(500);

			const result = await teacherClient.courses.get(testCourseId!);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(testCourseId);
				expect(result.data.title).toContain('Test Course');
				expect(result.data.code).toBe(testCourseCode);
				expect(result.data.visibility).toBe('private');
			}
		});

		it('should return complete course data structure', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const result = await teacherClient.courses.get(testCourseId!);

			expect(result.success).toBe(true);
			if (result.success) {
				const course = result.data;
				expect(course.id).toBeDefined();
				expect(course.title).toBeDefined();
				expect(course.code).toBeDefined();
				expect(course.visibility).toBeDefined();
				expect(course.ownerId).toBeDefined();
				expect(course.createdAt).toBeDefined();
				expect(course.updatedAt).toBeDefined();
			}
		});

		it('should return failure for non-existent course', async () => {
			const result = await teacherClient.courses.get('non-existent-course-id-12345');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Course not found');
			}
		});
	});

	describe('listMyCourses()', () => {
		it('should list courses owned by current user', async () => {
			const result = await teacherClient.courses.listMine();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
				// Should include our test courses
				if (testCourseId) {
					const found = result.data.some((c) => c.id === testCourseId);
					expect(found).toBe(true);
				}
			}
		});

		it('should apply limit option', async () => {
			const result = await teacherClient.courses.listMine({ limit: 1 });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.length).toBeLessThanOrEqual(1);
			}
		});

		it('should not return courses owned by other users', async () => {
			const result = await studentClient.courses.listMine();

			expect(result.success).toBe(true);
			if (result.success) {
				// Should not include teacher's course
				if (testCourseId) {
					const found = result.data.some((c) => c.id === testCourseId);
					expect(found).toBe(false);
				}
			}
		});
	});

	describe('listEnrolled()', () => {
		it('should list student enrolled courses', async () => {
			const result = await studentClient.courses.listEnrolled({ limit: 10 });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
			}
		});

		it('should not include teacher-owned courses before joining', async () => {
			const result = await studentClient.courses.listEnrolled();

			expect(result.success).toBe(true);
			if (result.success && testCourseId) {
				const found = result.data.some((c) => c.id === testCourseId);
				expect(found).toBe(false);
			}
		});
	});

	describe('listPublicCourses()', () => {
		it('should list public courses', async () => {
			const result = await teacherClient.courses.listPublic({ limit: 5 });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
				// Should include our public course
				if (testCourseId3) {
					const found = result.data.some((c) => c.id === testCourseId3);
					expect(found).toBe(true);
				}
			}
		});

		it('should not list private or unlisted courses', async () => {
			const result = await studentClient.courses.listPublic();

			expect(result.success).toBe(true);
			if (result.success) {
				// Private and unlisted courses should not appear
				const hasPrivate = result.data.some((c) => c.visibility === 'private');
				const hasUnlisted = result.data.some((c) => c.visibility === 'unlisted');
				expect(hasPrivate).toBe(false);
				expect(hasUnlisted).toBe(false);
			}
		});
	});

	describe('listAllEnrolled()', () => {
		it('should list all enrolled courses (student or auditor roles)', async () => {
			const result = await studentClient.courses.listAllEnrolled({ limit: 10 });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
			}
		});
	});

	describe('updateCourse()', () => {
		it('should update course title', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const newTitle = `Updated Course Title ${Date.now()}`;
			const result = await teacherClient.courses.update(testCourseId!, {
				title: newTitle
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.title).toBe(newTitle);
			}
		});

		it('should update course description', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const newDescription = `Updated description ${Date.now()}`;
			const result = await teacherClient.courses.update(testCourseId!, {
				description: newDescription
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.description).toBe(newDescription);
			}
		});

		it('should update course visibility', async () => {
			expect(testCourseId2, 'testCourseId2 should be set by prior test').toBeTruthy();

			const result = await teacherClient.courses.update(testCourseId2!, {
				visibility: 'public'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.visibility).toBe('public');
			}
		});

		it('should update theme', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const result = await teacherClient.courses.update(testCourseId!, {
				theme: 'dark'
			});

			expect(result.success).toBe(true);
		});

		it('should preserve ownerId and createdAt on update', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const original = await teacherClient.courses.get(testCourseId!);
			if (!original.success) return;

			const result = await teacherClient.courses.update(testCourseId!, {
				title: `Updated ${Date.now()}`
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.ownerId).toBe(original.data.ownerId);
				expect(result.data.createdAt).toBe(original.data.createdAt);
			}
		});
	});

	describe('getCourseRoster()', () => {
		it('should get course roster with owner', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const result = await teacherClient.courses.getRoster(testCourseId!);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
				// Owner should be in roster as instructor
				const owner = result.data.find((m) => m.role === 'instructor');
				expect(owner).toBeDefined();
			}
		});

		it('should include user information in roster', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const result = await teacherClient.courses.getRoster(testCourseId!);

			expect(result.success).toBe(true);
			if (result.success && result.data.length > 0) {
				const member = result.data[0];
				expect(member.role).toBeDefined();
				expect(member.status).toBeDefined();
			}
		});
	});

	describe('inviteMember()', () => {
		it('should invite a member as student', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const testEmail = `student-invite-${Date.now()}@example.com`;
			const result = await teacherClient.courses.inviteMember(testCourseId!, testEmail, 'student');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBeDefined();
			}
		});

		it('should invite a member as TA', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const testEmail = `ta-invite-${Date.now()}@example.com`;
			const result = await teacherClient.courses.inviteMember(testCourseId!, testEmail, 'ta');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBeDefined();
			}
		});

		it('should invite a member as auditor', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const testEmail = `auditor-invite-${Date.now()}@example.com`;
			const result = await teacherClient.courses.inviteMember(testCourseId!, testEmail, 'auditor');

			expect(result.success).toBe(true);
		});

		it('should fail to invite same email twice', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const testEmail = `duplicate-invite-${Date.now()}@example.com`;

			// First invite
			const result1 = await teacherClient.courses.inviteMember(testCourseId!, testEmail, 'student');
			expect(result1.success).toBe(true);

			// Second invite with same email
			const result2 = await teacherClient.courses.inviteMember(testCourseId!, testEmail);
			expect(result2.success).toBe(false);
		});

		it('should normalize email addresses', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const testEmail = `UPPERCASE-${Date.now()}@EXAMPLE.COM`;
			const result = await teacherClient.courses.inviteMember(testCourseId!, testEmail);

			expect(result.success).toBe(true);

			// Try inviting lowercase version - should fail as duplicate
			const result2 = await teacherClient.courses.inviteMember(
				testCourseId!,
				testEmail.toLowerCase()
			);
			expect(result2.success).toBe(false);
		});
	});

	describe('updateMember()', () => {
		it('should update member role to TA', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			// Get roster
			const rosterResult = await teacherClient.courses.getRoster(testCourseId!);
			if (!rosterResult.success || rosterResult.data.length === 0) {
				console.log('Skipping - no roster members');
				return;
			}

			// Find a student member
			const student = rosterResult.data.find((m) => m.role === 'student' && m.userId);
			if (!student || !student.userId) {
				console.log('Skipping - no student member');
				return;
			}

			const result = await teacherClient.courses.updateMember(testCourseId!, student.userId, {
				role: 'ta'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.role).toBe('ta');
			}
		});

		it('should update member status', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const rosterResult = await teacherClient.courses.getRoster(testCourseId!);
			if (!rosterResult.success || rosterResult.data.length === 0) {
				console.log('Skipping - no roster members');
				return;
			}

			const member = rosterResult.data.find((m) => m.userId && m.role !== 'instructor');
			if (!member || !member.userId) {
				console.log('Skipping - no eligible member');
				return;
			}

			const result = await teacherClient.courses.updateMember(testCourseId!, member.userId, {
				status: 'active'
			});

			expect(result.success).toBe(true);
		});
	});

	describe('removeMember()', () => {
		it('should remove member from course', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			// Invite someone first
			const testEmail = `remove-test-${Date.now()}@example.com`;
			const inviteResult = await teacherClient.courses.inviteMember(
				testCourseId!,
				testEmail,
				'student'
			);
			if (!inviteResult.success) {
				console.log('Skipping - could not invite member');
				return;
			}

			const memberId = inviteResult.data;

			// Remove them
			const result = await teacherClient.courses.removeMember(testCourseId!, memberId);

			expect(result.success).toBe(true);
		});
	});

	describe('joinByCode()', () => {
		it('should join course by valid code', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();
			expect(testCourseCode, 'testCourseCode should be set by prior test').toBeTruthy();

			// Student joins by code
			const result = await studentClient.courses.joinByCode(testCourseCode!);

			expect(result.success).toBe(true);
			if (result.success) {
				// joined could be true or alreadyMember could be true
				const didJoin = result.data.joined || result.data.alreadyMember || result.data.rejoined;
				expect(didJoin).toBe(true);
				expect(result.data.courseId).toBe(testCourseId);
			}
		});

		it('should fail with invalid code', async () => {
			const result = await studentClient.courses.joinByCode('INVALID-CODE-12345');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeDefined();
			}
		});

		it('should handle already member case', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();
			expect(testCourseCode, 'testCourseCode should be set by prior test').toBeTruthy();

			// Try to join twice
			const result1 = await studentClient.courses.joinByCode(testCourseCode!);
			expect(result1.success).toBe(true);

			// Second attempt should indicate already member
			const result2 = await studentClient.courses.joinByCode(testCourseCode!);
			expect(result2.success).toBe(true);
			if (result2.success) {
				const isAlreadyMember =
					result2.data.alreadyMember || result2.data.rejoined || !result2.data.joined;
				expect(isAlreadyMember).toBe(true);
			}
		});
	});

	describe('createAnnouncement()', () => {
		it('should create announcement in course', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const content = `Test announcement ${Date.now()}`;
			const result = await teacherClient.courses.createAnnouncement(testCourseId!, content);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.content).toBe(content);
				expect(result.data.id).toBeDefined();
				expect(result.data.createdAt).toBeDefined();
			}
		});

		it('should add multiple announcements', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const result1 = await teacherClient.courses.createAnnouncement(
				testCourseId!,
				'Announcement 1'
			);
			const result2 = await teacherClient.courses.createAnnouncement(
				testCourseId!,
				'Announcement 2'
			);

			expect(result1.success).toBe(true);
			expect(result2.success).toBe(true);

			// Verify both appear in course
			await delay(300);
			const courseResult = await teacherClient.courses.get(testCourseId!);
			if (courseResult.success && courseResult.data.announcements) {
				expect(courseResult.data.announcements.length).toBeGreaterThanOrEqual(2);
			}
		});

		it('should fan out persistent announcements to active members excluding actor', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const content = `Fanout announcement ${Date.now()}`;
			const createResult = await teacherClient.courses.createAnnouncement(testCourseId!, content);
			expect(createResult.success).toBe(true);
			if (!createResult.success) return;

			await delay(400);

			const studentInboxResult = await studentClient.announcements.listMine({ limit: 50 });
			expect(studentInboxResult.success).toBe(true);
			if (studentInboxResult.success) {
				const foundAnnouncement = studentInboxResult.data.find(
					(announcement) =>
						announcement.type === 'course_announcement' &&
						announcement.payload.courseId === testCourseId &&
						announcement.payload.courseAnnouncementId === createResult.data.id
				);
				expect(foundAnnouncement).toBeDefined();
				if (foundAnnouncement) {
					const markReadResult = await studentClient.announcements.markRead(foundAnnouncement.id);
					expect(markReadResult.success).toBe(true);
				}

				const markAllReadResult = await studentClient.announcements.markAllRead();
				expect(markAllReadResult.success).toBe(true);
			}

			const teacherInboxResult = await teacherClient.announcements.listMine({ limit: 50 });
			expect(teacherInboxResult.success).toBe(true);
			if (teacherInboxResult.success) {
				const ownEntryFound = teacherInboxResult.data.some(
					(announcement) =>
						announcement.type === 'course_announcement' &&
						announcement.payload.courseAnnouncementId === createResult.data.id
				);
				expect(ownEntryFound).toBe(false);
			}
		});
	});

	describe('copyCourse()', () => {
		it('should copy course with content', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const result = await teacherClient.courses.copy(testCourseId!, {
				title: `Copied Course ${Date.now()}`,
				includeContent: true,
				includeRoster: false
			});

			expect(result.success).toBe(true);
			if (result.success) {
				const copiedId = result.data;
				expect(copiedId).toBeDefined();
				// Clean up immediately
				await teacherClient.courses.delete(copiedId);
			}
		});

		it('should copy course without content', async () => {
			expect(testCourseId, 'testCourseId should be set by prior test').toBeTruthy();

			const result = await teacherClient.courses.copy(testCourseId!, {
				title: `Copied Empty ${Date.now()}`,
				includeContent: false,
				includeRoster: false
			});

			expect(result.success).toBe(true);
			if (result.success) {
				const copiedId = result.data;
				// Clean up immediately
				await teacherClient.courses.delete(copiedId);
			}
		});
	});

	describe('deleteCourse()', () => {
		it('should delete course', async () => {
			expect(testCourseId2, 'testCourseId2 should be set by prior test').toBeTruthy();

			const result = await teacherClient.courses.delete(testCourseId2!);

			expect(result.success).toBe(true);

			// Verify it's deleted
			await delay(300);
			const getResult = await teacherClient.courses.get(testCourseId2!);
			expect(getResult.success).toBe(false);

			testCourseId2 = null;
		});
	});

	describe('Course Lifecycle', () => {
		it('should handle complete course and membership lifecycle', async () => {
			// 1. Teacher creates course
			const createResult = await teacherClient.courses.create(
				`Lifecycle Course ${generateTestId()}`,
				`LC${Date.now().toString().slice(-6)}`,
				{ visibility: 'unlisted' }
			);

			expect(createResult.success).toBe(true);
			if (!createResult.success) return;

			const courseId = createResult.data;

			// 2. Teacher updates course
			const updateResult = await teacherClient.courses.update(courseId, {
				description: 'Updated description'
			});
			expect(updateResult.success).toBe(true);

			// 3. Teacher invites student via email
			const inviteResult = await teacherClient.courses.inviteMember(
				courseId,
				`lifecycle-student-${Date.now()}@example.com`,
				'student'
			);
			expect(inviteResult.success).toBe(true);

			// 4. Check roster has both
			await delay(300);
			const rosterResult = await teacherClient.courses.getRoster(courseId);
			expect(rosterResult.success).toBe(true);

			// 5. Create announcement
			const announcementResult = await teacherClient.courses.createAnnouncement(
				courseId,
				'Welcome to the course'
			);
			expect(announcementResult.success).toBe(true);

			// 6. Delete course
			const deleteResult = await teacherClient.courses.delete(courseId);
			expect(deleteResult.success).toBe(true);
		});
	});
});
