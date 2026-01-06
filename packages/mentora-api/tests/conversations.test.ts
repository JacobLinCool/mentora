/**
 * Integration Tests for Conversations API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupIntegrationTests, teardownIntegrationTests, createTestConfig } from './setup';
import * as ConversationsAPI from '$lib/api/conversations';
import * as AssignmentsAPI from '$lib/api/assignments';
import * as CoursesAPI from '$lib/api/courses';

describe('Conversations API Integration', () => {
	let assignmentId: string;
	const testEmail = `conv-user-${Date.now()}@test.com`;

	beforeAll(async () => {
		await setupIntegrationTests();

		// Create prerequisites: Course -> Assignment
		const config = await createTestConfig({ authenticated: true, email: testEmail });

		const courseResult = await CoursesAPI.createCourse(config, 'Course for Conversations');
		if (!courseResult.success) throw new Error('Failed to create course');

		const assignmentResult = await AssignmentsAPI.createAssignment(config, {
			courseId: courseResult.data,
			topicId: null,
			orderInTopic: null,
			title: 'Assignment for Conversations',
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

	describe('createConversation (Backend API)', () => {
		it('should create a conversation when authenticated', async () => {
			const config = await createTestConfig({ authenticated: true, email: testEmail });

			const result = await ConversationsAPI.createConversation(config, assignmentId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBeDefined();
				expect(result.data.state).toBe('awaiting_idea');
				expect(result.data.isExisting).toBe(false);
			}
		});

		it('should fail when not authenticated', async () => {
			const config = {
				...(await createTestConfig({ authenticated: false })),
				getCurrentUser: () => null
			};

			const result = await ConversationsAPI.createConversation(config, assignmentId);

			expect(result.success).toBe(false);
		});
	});

	describe('getConversation', () => {
		it('should retrieve a conversation by ID', async () => {
			const config = await createTestConfig({ authenticated: true, email: testEmail });

			// Get existing conversation ID first
			const listResult = await ConversationsAPI.getAssignmentConversation(config, assignmentId);
			if (!listResult.success) throw new Error('Failed to get conversation');
			const conversationId = listResult.data.id;

			// Get it
			const getResult = await ConversationsAPI.getConversation(config, conversationId);

			expect(getResult.success).toBe(true);
			if (getResult.success) {
				expect(getResult.data.id).toBe(conversationId);
				expect(getResult.data.assignmentId).toBe(assignmentId);
			}
		});
	});

	describe('addTurn', () => {
		it('should add a message turn to conversation', async () => {
			const config = await createTestConfig({ authenticated: true, email: testEmail });

			const listResult = await ConversationsAPI.getAssignmentConversation(config, assignmentId);
			if (!listResult.success) throw new Error('Failed to get conversation');
			const conversationId = listResult.data.id;

			// Add turn
			const result = await ConversationsAPI.addTurn(config, conversationId, 'Hello, AI', 'idea');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.conversation.turns.length).toBeGreaterThan(0);
				expect(result.data.conversation.state).toBe('adding_counterpoint'); // Based on logic
				expect(result.data.turnId).toBeDefined();
			}
		});
	});

	describe('endConversation (Backend API)', () => {
		it('should mark conversation as completed', async () => {
			const config = await createTestConfig({ authenticated: true, email: testEmail });

			const listResult = await ConversationsAPI.getAssignmentConversation(config, assignmentId);
			if (!listResult.success) throw new Error('Failed to get conversation');
			const conversationId = listResult.data.id;

			// End it
			const endResult = await ConversationsAPI.endConversation(config, conversationId);
			if (!endResult.success) {
				console.error('End Conversation Failed:', endResult.error);
			}
			expect(endResult.success).toBe(true);

			if (endResult.success) {
				expect(endResult.data.state).toBe('closed');
			}

			// Verify status via get
			const getResult = await ConversationsAPI.getConversation(config, conversationId);
			expect(getResult.success).toBe(true);
			if (getResult.success) {
				expect(getResult.data.state).toBe('closed');
			}
		});
	});
});
