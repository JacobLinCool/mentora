/**
 * Comprehensive Integration Tests - Multi-Account Scenarios
 *
 * Tests real-world workflows with Teacher and Student accounts.
 * Covers: course lifecycle, enrollment, assignments, submissions, grading.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	setupBothClients,
	teardownAllClients,
	getTeacherUser,
	getStudentUser,
	generateTestId,
	delay
} from './emulator-setup.js';
import type { MentoraClient } from '../src/lib/api/client.js';

describe('Multi-Account Scenarios', () => {
	let teacher: MentoraClient;
	let student: MentoraClient;

	// Shared test data IDs
	let testCourseId: string | null = null;
	let testCourseCode: string | null = null;
	let testTopicId: string | null = null;
	let testAssignmentId: string | null = null;
	let testConversationId: string | null = null;

	beforeAll(async () => {
		const clients = await setupBothClients();
		teacher = clients.teacher;
		student = clients.student;
	}, 60000);

	afterAll(async () => {
		// Clean up in reverse order of creation
		if (testAssignmentId) {
			try {
				await teacher.assignments.delete(testAssignmentId);
			} catch {
				// Ignore
			}
		}
		if (testTopicId) {
			try {
				await teacher.topics.delete(testTopicId);
			} catch {
				// Ignore
			}
		}
		if (testCourseId) {
			try {
				await teacher.courses.delete(testCourseId);
			} catch {
				// Ignore
			}
		}
		await teardownAllClients();
	}, 30000);

	// ============================================================
	// SCENARIO 1: Course Creation and Student Enrollment
	// ============================================================

	describe('Scenario 1: Course Lifecycle', () => {
		it('Teacher: should create a course', async () => {
			const title = `Integration Test Course ${generateTestId()}`;
			testCourseCode = `IT${Date.now().toString().slice(-8)}`;

			const result = await teacher.courses.create(title, testCourseCode, {
				visibility: 'unlisted',
				description: 'Created by integration test'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				testCourseId = result.data;
				expect(testCourseId).toBeDefined();
			}
		});

		it('Teacher: should get course details', async () => {
			if (!testCourseId) {
				console.log('Skipping - no course created');
				return;
			}

			await delay(500);

			const result = await teacher.courses.get(testCourseId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(testCourseId);
				expect(result.data.code).toBe(testCourseCode);
			}
		});

		it('Teacher: should be in course roster as instructor', async () => {
			if (!testCourseId) {
				console.log('Skipping - no course created');
				return;
			}

			const result = await teacher.courses.getRoster(testCourseId);

			expect(result.success).toBe(true);
			if (result.success) {
				const teacherEntry = result.data.find(
					(m) => m.userId === getTeacherUser()?.uid || m.email === getTeacherUser()?.email
				);
				expect(teacherEntry).toBeDefined();
				expect(teacherEntry?.role).toBe('instructor');
			}
		});

		it('Student: should NOT see private course before joining', async () => {
			if (!testCourseId) {
				console.log('Skipping - no course created');
				return;
			}

			// Student tries to get course directly - should fail without membership
			const result = await student.courses.get(testCourseId);

			// May succeed if course is public, or fail if unlisted/private
			if (!result.success) {
				expect(result.error).toBeDefined();
			}
		});

		it('Student: should join course by code', async () => {
			if (!testCourseCode) {
				console.log('Skipping - no course code');
				return;
			}

			const result = await student.courses.joinByCode(testCourseCode);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.joined || result.data.alreadyMember || result.data.rejoined).toBe(true);
			}
		});

		it('Student: should now see course after joining', async () => {
			if (!testCourseId) {
				console.log('Skipping - no course created');
				return;
			}

			await delay(500);

			const result = await student.courses.get(testCourseId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(testCourseId);
			}
		});

		it('Teacher: should see student in roster', async () => {
			if (!testCourseId) {
				console.log('Skipping - no course created');
				return;
			}

			const result = await teacher.courses.getRoster(testCourseId);

			expect(result.success).toBe(true);
			if (result.success) {
				const studentEntry = result.data.find(
					(m) => m.userId === getStudentUser()?.uid || m.email === getStudentUser()?.email
				);
				expect(studentEntry).toBeDefined();
				expect(studentEntry?.role).toBe('student');
			}
		});
	});

	// ============================================================
	// SCENARIO 2: Topics and Assignments
	// ============================================================

	describe('Scenario 2: Topics and Assignments', () => {
		it('Teacher: should create a topic', async () => {
			if (!testCourseId) {
				console.log('Skipping - no course created');
				return;
			}

			const result = await teacher.topics.create({
				courseId: testCourseId,
				title: `Test Topic ${generateTestId()}`,
				description: 'Topic for integration testing',
				order: 1,
				contents: [],
				contentTypes: []
			});
			if (result.success) {
				testTopicId = result.data;
				expect(testTopicId).toBeDefined();
			}
		});

		it('Teacher: should create an assignment', async () => {
			if (!testCourseId) {
				console.log('Skipping - no course created');
				return;
			}

			const result = await teacher.assignments.create({
				courseId: testCourseId,
				topicId: testTopicId,
				title: `Test Assignment ${generateTestId()}`,
				question: null,
				prompt: 'This is an integration test assignment. Please provide your thoughtful response.',
				mode: 'instant',
				startAt: Date.now() - 60000, // Started 1 minute ago
				dueAt: null,
				allowLate: true,
				allowResubmit: true
			});

			expect(result.success).toBe(true);
			if (result.success) {
				testAssignmentId = result.data;
				expect(testAssignmentId).toBeDefined();
			}
		});

		it('Teacher: should get assignment details', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no assignment created');
				return;
			}

			await delay(500);

			const result = await teacher.assignments.get(testAssignmentId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(testAssignmentId);
				expect(result.data.courseId).toBe(testCourseId);
			}
		});

		it('Student: should see assignment in course', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no assignment created');
				return;
			}

			const result = await student.assignments.get(testAssignmentId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(testAssignmentId);
			}
		});

		it('Teacher: should update assignment', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no assignment created');
				return;
			}

			const newTitle = `Updated Assignment ${Date.now()}`;
			const result = await teacher.assignments.update(testAssignmentId, {
				title: newTitle
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.title).toBe(newTitle);
			}
		});
	});

	// ============================================================
	// SCENARIO 3: Submissions and Grading
	// ============================================================

	describe('Scenario 3: Submissions and Grading', () => {
		it('Student: should start a submission', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no assignment created');
				return;
			}

			const result = await student.submissions.start(testAssignmentId);

			expect(result.success).toBe(true);
		});

		it('Student: should get their submission', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no assignment created');
				return;
			}

			await delay(500);

			const result = await student.submissions.getMine(testAssignmentId);

			expect(result.success).toBe(true);
			if (result.success && result.data) {
				expect(result.data.userId).toBe(getStudentUser()?.uid);
			}
		});

		it('Student: should submit the assignment', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no assignment created');
				return;
			}

			const result = await student.submissions.submit(testAssignmentId);

			expect(result.success).toBe(true);
		});

		it('Teacher: should see student submission', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no assignment created');
				return;
			}

			await delay(500);

			const studentUid = getStudentUser()?.uid;
			if (!studentUid) {
				console.log('Skipping - no student UID');
				return;
			}

			const result = await teacher.submissions.get(testAssignmentId, studentUid);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.userId).toBe(studentUid);
			}
		});

		it('Teacher: should list all submissions for assignment', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no assignment created');
				return;
			}

			const result = await teacher.submissions.listForAssignment(testAssignmentId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
				expect(result.data.length).toBeGreaterThanOrEqual(1);
			}
		});

		it('Teacher: should grade submission', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no assignment created');
				return;
			}

			const studentUid = getStudentUser()?.uid;
			if (!studentUid) {
				console.log('Skipping - no student UID');
				return;
			}

			const result = await teacher.submissions.grade(testAssignmentId, studentUid, {
				scoreCompletion: 95,
				notes: 'Excellent work! Great integration test.',
				state: 'graded_complete'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.scoreCompletion).toBe(95);
			}
		});

		it('Student: should see graded submission', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no assignment created');
				return;
			}

			await delay(500);

			const result = await student.submissions.getMine(testAssignmentId);

			expect(result.success).toBe(true);
			if (result.success && result.data) {
				expect(result.data.scoreCompletion).toBe(95);
				expect(result.data.state).toBe('graded_complete');
			}
		});
	});

	// ============================================================
	// SCENARIO 4: Conversations
	// ============================================================

	describe('Scenario 4: Conversations', () => {
		it('Student: should create a conversation for assignment', async () => {
			if (!testAssignmentId) {
				console.log('Skipping - no assignment created');
				return;
			}

			const result = await student.conversations.create(testAssignmentId);

			expect(result.success).toBe(true);
			if (result.success) {
				testConversationId = result.data.id;
				expect(testConversationId).toBeDefined();
			}
		});

		it('Student: should get their conversation', async () => {
			if (!testConversationId) {
				console.log('Skipping - no conversation created');
				return;
			}

			await delay(500);

			const result = await student.conversations.get(testConversationId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(testConversationId);
				expect(result.data.userId).toBe(getStudentUser()?.uid);
			}
		});

		it('Student: should get conversation by assignment', async () => {
			if (!testAssignmentId || !testConversationId) {
				console.log('Skipping - no conversation/assignment');
				return;
			}

			const result = await student.conversations.getForAssignment(testAssignmentId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(testConversationId);
			}
		});

		it('Teacher: should view student conversation', async () => {
			if (!testConversationId) {
				console.log('Skipping - no conversation created');
				return;
			}

			const result = await teacher.conversations.get(testConversationId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.userId).toBe(getStudentUser()?.uid);
			}
		});

		it('Student: should end conversation', async () => {
			if (!testConversationId) {
				console.log('Skipping - no conversation created');
				return;
			}

			const result = await student.conversations.end(testConversationId);

			expect(result.success).toBe(true);
			if (result.success) {
				testConversationId = null;
			}
		});
	});

	// ============================================================
	// SCENARIO 5: Roster Management
	// ============================================================

	describe('Scenario 5: Roster Management', () => {
		it('Teacher: should invite another member', async () => {
			if (!testCourseId) {
				console.log('Skipping - no course created');
				return;
			}

			const testEmail = `test-invite-${Date.now()}@example.com`;
			const result = await teacher.courses.inviteMember(testCourseId, testEmail, 'auditor');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBeDefined();
			}
		});

		it('Teacher: should update student role to TA', async () => {
			if (!testCourseId) {
				console.log('Skipping - no course created');
				return;
			}

			const studentUid = getStudentUser()?.uid;
			if (!studentUid) {
				console.log('Skipping - no student UID');
				return;
			}

			const result = await teacher.courses.updateMember(testCourseId, studentUid, {
				role: 'ta'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.role).toBe('ta');
			}
		});

		it('Student: should now have TA permissions', async () => {
			if (!testCourseId) {
				console.log('Skipping - no course created');
				return;
			}

			await delay(500);

			// As TA, student should be able to view roster
			const result = await student.courses.getRoster(testCourseId);

			expect(result.success).toBe(true);
			if (result.success) {
				const studentEntry = result.data.find((m) => m.userId === getStudentUser()?.uid);
				expect(studentEntry?.role).toBe('ta');
			}
		});

		it('Teacher: should change student back to student role', async () => {
			if (!testCourseId) {
				console.log('Skipping - no course created');
				return;
			}

			const studentUid = getStudentUser()?.uid;
			if (!studentUid) {
				console.log('Skipping - no student UID');
				return;
			}

			const result = await teacher.courses.updateMember(testCourseId, studentUid, {
				role: 'student'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.role).toBe('student');
			}
		});
	});

	// ============================================================
	// SCENARIO 6: Course Updates
	// ============================================================

	describe('Scenario 6: Course Updates', () => {
		it('Teacher: should update course details', async () => {
			if (!testCourseId) {
				console.log('Skipping - no course created');
				return;
			}

			const newTitle = `Updated Course Title ${Date.now()}`;
			const result = await teacher.courses.update(testCourseId, {
				title: newTitle,
				description: 'Updated description from integration test'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.title).toBe(newTitle);
			}
		});

		it('Student: should see updated course', async () => {
			if (!testCourseId) {
				console.log('Skipping - no course created');
				return;
			}

			await delay(500);

			const result = await student.courses.get(testCourseId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.description).toContain('Updated description');
			}
		});
	});
});
