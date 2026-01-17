/**
 * Integration Tests for submission operations with advanced scenarios
 *
 * Tests the submissions module against real Firebase covering:
 * - Multiple submissions/resubmissions
 * - Late submissions
 * - Grading workflows
 * - State transitions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { doc, setDoc } from 'firebase/firestore';
import { Courses } from 'mentora-firebase';
import {
	setupTeacherClient,
	setupStudentClient,
	teardownAllClients,
	initTeacherFirebase,
	getStudentUser,
	generateTestId,
	delay
} from './emulator-setup.js';
import type { MentoraClient } from '../src/lib/api/client.js';

describe('Submissions Module - Advanced Scenarios (Integration)', () => {
	let teacherClient: MentoraClient;
	let studentClient: MentoraClient;
	let testCourseId: string | null = null;
	let assignmentAllowResubmit: string | null = null;
	let assignmentNoResubmit: string | null = null;
	let assignmentWithDueDate: string | null = null;

	beforeAll(async () => {
		teacherClient = await setupTeacherClient();
		studentClient = await setupStudentClient();

		// Create a test course
		const courseResult = await teacherClient.courses.create(
			`Test Course for Submissions ${generateTestId()}`,
			`TS${Date.now().toString().slice(-6)}`,
			{ visibility: 'private' }
		);
		if (courseResult.success) {
			testCourseId = courseResult.data;

			// Enroll the student into the course roster so they can read course-bound assignments.
			const student = getStudentUser();
			if (student?.uid && student.email) {
				const { db } = initTeacherFirebase();
				await setDoc(doc(db, Courses.roster.docPath(testCourseId, student.uid)), {
					userId: student.uid,
					email: student.email,
					role: 'student',
					status: 'active',
					joinedAt: Date.now()
				});
			}

			// Create assignment that allows resubmit
			const result1 = await teacherClient.assignments.create({
				courseId: testCourseId,
				topicId: null,
				orderInTopic: null,
				title: `Allow Resubmit ${generateTestId()}`,
				prompt: 'Can be resubmitted',
				mode: 'instant',
				startAt: Date.now() - 60000,
				dueAt: null,
				allowLate: true,
				allowResubmit: true
			});
			if (result1.success) {
				assignmentAllowResubmit = result1.data;
			}

			// Create assignment that doesn't allow resubmit
			const result2 = await teacherClient.assignments.create({
				courseId: testCourseId,
				topicId: null,
				orderInTopic: null,
				title: `No Resubmit ${generateTestId()}`,
				prompt: 'Cannot be resubmitted',
				mode: 'instant',
				startAt: Date.now() - 60000,
				dueAt: null,
				allowLate: true,
				allowResubmit: false
			});
			if (result2.success) {
				assignmentNoResubmit = result2.data;
			}

			// Create assignment with due date in past
			const pastDueDate = Date.now() - 24 * 60 * 60 * 1000; // Yesterday
			const result3 = await teacherClient.assignments.create({
				courseId: testCourseId,
				topicId: null,
				orderInTopic: null,
				title: `Past Due Date ${generateTestId()}`,
				prompt: 'Due date is in the past',
				mode: 'instant',
				startAt: Date.now() - 48 * 60 * 60 * 1000,
				dueAt: pastDueDate,
				allowLate: true,
				allowResubmit: true
			});
			if (result3.success) {
				assignmentWithDueDate = result3.data;
			}
		}

		await delay(500);
	});

	afterAll(async () => {
		// Clean up test assignments
		const assignmentIds = [assignmentAllowResubmit, assignmentNoResubmit, assignmentWithDueDate];
		for (const id of assignmentIds) {
			if (id) {
				try {
					await teacherClient.assignments.delete(id);
				} catch {
					// Ignore cleanup errors
				}
			}
		}
		// Clean up test course
		if (testCourseId) {
			try {
				await teacherClient.courses.delete(testCourseId);
			} catch {
				// Ignore cleanup errors
			}
		}
		await teardownAllClients();
	});

	describe('startSubmission()', () => {
		it('should start a new submission', async () => {
			if (!assignmentAllowResubmit) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const result = await studentClient.submissions.start(assignmentAllowResubmit);

			expect(result.success).toBe(true);
		});

		it('should start submission with state in_progress', async () => {
			if (!assignmentNoResubmit) {
				console.log('Skipping - no test assignment created');
				return;
			}

			await studentClient.submissions.start(assignmentNoResubmit);
			await delay(300);

			const result = await studentClient.submissions.getMine(assignmentNoResubmit);

			expect(result.success).toBe(true);
			if (result.success && result.data) {
				expect(result.data.state).toBe('in_progress');
				expect(result.data.startedAt).toBeDefined();
				expect(result.data.submittedAt).toBeNull();
			}
		});

		it('should start multiple submissions sequentially', async () => {
			if (!assignmentAllowResubmit) {
				console.log('Skipping - no test assignment created');
				return;
			}

			// Start first submission
			const result1 = await studentClient.submissions.start(assignmentAllowResubmit);
			expect(result1.success).toBe(true);

			await delay(100);

			// Submit it
			const submitResult = await studentClient.submissions.submit(assignmentAllowResubmit);
			expect(submitResult.success).toBe(true);

			await delay(300);

			// Verify it's submitted
			let getResult = await studentClient.submissions.getMine(assignmentAllowResubmit);
			expect(getResult.success).toBe(true);
			if (getResult.success && getResult.data) {
				expect(getResult.data.state).toBe('submitted');
			}

			// Start second submission
			const result2 = await studentClient.submissions.start(assignmentAllowResubmit);
			expect(result2.success).toBe(true);

			await delay(300);

			// Verify new submission is in progress
			getResult = await studentClient.submissions.getMine(assignmentAllowResubmit);
			expect(getResult.success).toBe(true);
			if (getResult.success && getResult.data) {
				expect(getResult.data.state).toBe('in_progress');
			}
		});
	});

	describe('submitAssignment()', () => {
		it('should submit assignment and set submittedAt timestamp', async () => {
			if (!assignmentAllowResubmit) {
				console.log('Skipping - no test assignment created');
				return;
			}

			// First ensure clean state - check if already submitted
			const existing = await studentClient.submissions.getMine(assignmentAllowResubmit);
			if (existing.success && existing.data?.state === 'submitted') {
				// Start a new one for this test
				await studentClient.submissions.start(assignmentAllowResubmit);
			}

			const beforeSubmit = Date.now();
			const result = await studentClient.submissions.submit(assignmentAllowResubmit);
			const afterSubmit = Date.now();

			expect(result.success).toBe(true);

			// Verify submission state
			await delay(300);
			const getResult = await studentClient.submissions.getMine(assignmentAllowResubmit);
			expect(getResult.success).toBe(true);
			if (getResult.success && getResult.data) {
				expect(getResult.data.state).toBe('submitted');
				expect(getResult.data.submittedAt).toBeGreaterThanOrEqual(beforeSubmit);
				expect(getResult.data.submittedAt).toBeLessThanOrEqual(afterSubmit + 1000); // Allow 1s tolerance
			}
		});

		it('should resubmit when allowResubmit is true', async () => {
			if (!assignmentAllowResubmit) {
				console.log('Skipping - no test assignment created');
				return;
			}

			// Check current state
			const existing = await studentClient.submissions.getMine(assignmentAllowResubmit);
			expect(existing.success).toBe(true);

			if (existing.success && existing.data?.state === 'submitted') {
				// Resubmit by starting a new submission
				const result = await studentClient.submissions.start(assignmentAllowResubmit);
				expect(result.success).toBe(true);

				await delay(200);

				// Verify we're back in progress
				const progressResult = await studentClient.submissions.getMine(assignmentAllowResubmit);
				expect(progressResult.success).toBe(true);
				if (progressResult.success && progressResult.data) {
					expect(progressResult.data.state).toBe('in_progress');
				}

				// Submit again
				const submitResult = await studentClient.submissions.submit(assignmentAllowResubmit);
				expect(submitResult.success).toBe(true);

				await delay(200);

				// Verify submitted again
				const finalResult = await studentClient.submissions.getMine(assignmentAllowResubmit);
				expect(finalResult.success).toBe(true);
				if (finalResult.success && finalResult.data) {
					expect(finalResult.data.state).toBe('submitted');
				}
			}
		});
	});

	describe('Late Submissions', () => {
		it('should set late flag based on due date', async () => {
			if (!assignmentWithDueDate) {
				console.log('Skipping - no test assignment with due date');
				return;
			}

			// Start and submit
			const startResult = await studentClient.submissions.start(assignmentWithDueDate);
			expect(startResult.success).toBe(true);

			await delay(200);

			const submitResult = await studentClient.submissions.submit(assignmentWithDueDate);
			expect(submitResult.success).toBe(true);

			// Verify submission properties
			await delay(300);
			const getResult = await studentClient.submissions.getMine(assignmentWithDueDate);
			expect(getResult.success).toBe(true);
			if (getResult.success && getResult.data) {
				expect(getResult.data.state).toBe('submitted');
				expect(getResult.data.submittedAt).toBeDefined();
				// late flag should be set based on dueAt comparison
				expect(getResult.data.late).toBe(true);
			}
		});
	});

	describe('gradeSubmission()', () => {
		it('should grade submission with score', async () => {
			if (!assignmentAllowResubmit) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const studentUid = getStudentUser()?.uid;
			if (!studentUid) {
				console.log('Skipping - no student UID');
				return;
			}

			// Ensure submission exists and is submitted
			const submission = await studentClient.submissions.getMine(assignmentAllowResubmit);
			if (!submission.success || submission.data?.state !== 'submitted') {
				// Create and submit
				await studentClient.submissions.start(assignmentAllowResubmit);
				await delay(100);
				await studentClient.submissions.submit(assignmentAllowResubmit);
				await delay(300);
			}

			const result = await teacherClient.submissions.grade(assignmentAllowResubmit, studentUid, {
				scoreCompletion: 95,
				notes: 'Excellent work!'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.scoreCompletion).toBe(95);
				expect(result.data.notes).toBe('Excellent work!');
			}
		});

		it('should grade submission with state', async () => {
			if (!assignmentNoResubmit) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const studentUid = getStudentUser()?.uid;
			if (!studentUid) {
				console.log('Skipping - no student UID');
				return;
			}

			// Create submission
			const startResult = await studentClient.submissions.start(assignmentNoResubmit);
			expect(startResult.success).toBe(true);

			await delay(200);

			const submitResult = await studentClient.submissions.submit(assignmentNoResubmit);
			expect(submitResult.success).toBe(true);

			await delay(300);

			// Grade with state
			const result = await teacherClient.submissions.grade(assignmentNoResubmit, studentUid, {
				scoreCompletion: 80,
				state: 'submitted'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.state).toBe('submitted');
				expect(result.data.scoreCompletion).toBe(80);
			}
		});

		it('should update grading with different states', async () => {
			if (!assignmentAllowResubmit) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const studentUid = getStudentUser()?.uid;
			if (!studentUid) {
				console.log('Skipping - no student UID');
				return;
			}

			// Ensure we have a submitted submission
			const submission = await studentClient.submissions.getMine(assignmentAllowResubmit);
			if (!submission.success || submission.data?.state !== 'submitted') {
				console.log('Skipping - no submitted submission');
				return;
			}

			// Grade with partial
			const result1 = await teacherClient.submissions.grade(assignmentAllowResubmit, studentUid, {
				scoreCompletion: 50,
				state: 'graded_complete',
				notes: 'Partial credit'
			});
			expect(result1.success).toBe(true);
			if (result1.success) {
				expect(result1.data.state).toBe('graded_complete');
			}

			await delay(200);

			// Update to complete
			const result2 = await teacherClient.submissions.grade(assignmentAllowResubmit, studentUid, {
				scoreCompletion: 85,
				state: 'graded_complete',
				notes: 'Updated to full credit'
			});
			expect(result2.success).toBe(true);
			if (result2.success) {
				expect(result2.data.state).toBe('graded_complete');
				expect(result2.data.scoreCompletion).toBe(85);
				expect(result2.data.notes).toBe('Updated to full credit');
			}
		});

		it('should allow updating only some grading fields', async () => {
			if (!assignmentWithDueDate) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const studentUid = getStudentUser()?.uid;
			if (!studentUid) {
				console.log('Skipping - no student UID');
				return;
			}

			// Create submission
			const startResult = await studentClient.submissions.start(assignmentWithDueDate);
			expect(startResult.success).toBe(true);

			await delay(100);

			const submitResult = await studentClient.submissions.submit(assignmentWithDueDate);
			expect(submitResult.success).toBe(true);

			await delay(300);

			// Grade with score only
			const result1 = await teacherClient.submissions.grade(assignmentWithDueDate, studentUid, {
				scoreCompletion: 90
			});
			expect(result1.success).toBe(true);

			await delay(200);

			// Update only notes
			const result2 = await teacherClient.submissions.grade(assignmentWithDueDate, studentUid, {
				notes: 'Added notes later'
			});
			expect(result2.success).toBe(true);
			if (result2.success) {
				expect(result2.data.notes).toBe('Added notes later');
				expect(result2.data.scoreCompletion).toBe(90);
			}
		});
	});

	describe('listAssignmentSubmissions()', () => {
		it('should list all submissions for an assignment', async () => {
			if (!assignmentAllowResubmit) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const result = await teacherClient.submissions.listForAssignment(assignmentAllowResubmit);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
				expect(result.data.length).toBeGreaterThanOrEqual(1);
			}
		});

		it('should list submissions with limit', async () => {
			if (!assignmentAllowResubmit) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const result = await teacherClient.submissions.listForAssignment(assignmentAllowResubmit, {
				limit: 5
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.length).toBeLessThanOrEqual(5);
			}
		});

		it('should list submissions ordered by startedAt descending', async () => {
			if (!assignmentAllowResubmit) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const result = await teacherClient.submissions.listForAssignment(assignmentAllowResubmit);

			expect(result.success).toBe(true);
			if (result.success && result.data.length > 1) {
				// Verify descending order
				for (let i = 0; i < result.data.length - 1; i++) {
					expect(result.data[i].startedAt).toBeGreaterThanOrEqual(result.data[i + 1].startedAt);
				}
			}
		});
	});

	describe('Submission Data Integrity', () => {
		it('should preserve submission fields after grading', async () => {
			if (!assignmentAllowResubmit) {
				console.log('Skipping - no test assignment created');
				return;
			}

			const studentUid = getStudentUser()?.uid;
			if (!studentUid) {
				console.log('Skipping - no student UID');
				return;
			}

			// Get current submission state
			const current = await studentClient.submissions.getMine(assignmentAllowResubmit);
			if (!current.success || !current.data || current.data.state !== 'submitted') {
				// Create fresh submission
				await studentClient.submissions.start(assignmentAllowResubmit);
				await delay(100);
				await studentClient.submissions.submit(assignmentAllowResubmit);
				await delay(300);
			}

			// Get original submission
			const originalResult = await studentClient.submissions.getMine(assignmentAllowResubmit);
			expect(originalResult.success).toBe(true);
			if (!originalResult.success || !originalResult.data) return;

			const original = originalResult.data;
			const originalStartedAt = original.startedAt;
			const originalSubmittedAt = original.submittedAt;

			// Grade the submission
			const gradeResult = await teacherClient.submissions.grade(
				assignmentAllowResubmit,
				studentUid,
				{
					scoreCompletion: 88,
					notes: 'Good work'
				}
			);

			expect(gradeResult.success).toBe(true);
			if (!gradeResult.success) return;

			const graded = gradeResult.data;

			// Verify unchanged fields
			expect(graded.userId).toBe(original.userId);
			expect(graded.startedAt).toBe(originalStartedAt);
			expect(graded.submittedAt).toBe(originalSubmittedAt);

			// Verify new fields
			expect(graded.scoreCompletion).toBe(88);
			expect(graded.notes).toBe('Good work');
		});
	});
});
