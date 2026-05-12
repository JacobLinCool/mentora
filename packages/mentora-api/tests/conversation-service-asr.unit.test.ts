/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DialogueStage } from 'mentora-ai';
import { ConversationService } from '../src/lib/server/application/conversation-service.js';
import type { IConversationRepository } from '../src/lib/server/repositories/ports/conversation-repository.js';
import type { IConversationLLMGateway } from '../src/lib/server/application/gateways/conversation-llm-gateway.js';
import type { IWalletRepository } from '../src/lib/server/repositories/ports/wallet-repository.js';

// Mock executors module
vi.mock('../src/lib/server/llm/executors.js', () => ({
	EXECUTOR_MODEL: {
		PROMPT: 'test-prompt',
		ASR: 'test-asr',
		CONTENT: 'test-content',
		TTS: 'test-tts'
	},
	getASRExecutor: vi.fn(),
	getTTSExecutor: vi.fn()
}));

import { getASRExecutor, getTTSExecutor } from '../src/lib/server/llm/executors.js';

const mockedGetASRExecutor = vi.mocked(getASRExecutor);
const mockedGetTTSExecutor = vi.mocked(getTTSExecutor);

function createMockConversation() {
	return {
		assignmentId: 'assignment-1',
		userId: 'user-1',
		state: 'awaiting_idea' as const,
		lastActionAt: Date.now(),
		createdAt: Date.now(),
		updatedAt: Date.now(),
		turns: [],
		tokenUsage: null
	};
}

function createMockSubmission() {
	return {
		userId: 'user-1',
		state: 'in_progress' as const,
		startedAt: Date.now() - 1000,
		submittedAt: null,
		late: false,
		scoreCompletion: null,
		notes: null,
		assessment: null,
		assessmentError: null,
		totalSpentUsd: 0,
		budgetExhausted: false
	};
}

function createMockAssignment() {
	return {
		id: 'assignment-1',
		courseId: 'course-1',
		topicId: null,
		title: 'Test',
		question: 'Test question',
		prompt: 'Test prompt',
		mode: 'instant' as const,
		startAt: Date.now() - 10000,
		dueAt: null,
		allowLate: false,
		allowResubmit: false,
		studentBudgetUsd: null,
		createdBy: 'teacher-1',
		createdAt: Date.now(),
		updatedAt: Date.now(),
		classReport: null
	};
}

function createMockRepo(overrides?: Partial<IConversationRepository>): IConversationRepository {
	return {
		getConversation: vi.fn().mockResolvedValue(createMockConversation()),
		getAssignment: vi.fn().mockResolvedValue(createMockAssignment()),
		createConversation: vi.fn(),
		updateConversation: vi.fn(),
		deleteConversationState: vi.fn(),
		getMembership: vi.fn(),
		getSubmission: vi.fn().mockResolvedValue(null),
		saveSubmission: vi.fn(),
		appendTurns: vi.fn(),
		incrementSubmissionSpend: vi.fn(),
		...overrides
	};
}

function createMockLLMGateway(): IConversationLLMGateway {
	return {
		process: vi.fn().mockResolvedValue({
			aiMessage: 'AI response',
			ended: false,
			stanceSnapshot: null,
			updatedState: {},
			assessment: null,
			assessmentError: null,
			tokenUsage: {
				cachedContentTokenCount: 0,
				candidatesTokenCount: 10,
				promptTokenCount: 5,
				thoughtsTokenCount: 0,
				toolUsePromptTokenCount: 0,
				totalTokenCount: 15
			}
		}),
		extractSummary: vi.fn().mockReturnValue({
			stage: 'exploring',
			currentStance: null,
			currentPrinciple: null
		})
	};
}

function createMockASRExecutor(transcribeResult: string | Error) {
	return {
		resetTokenUsage: vi.fn(),
		transcribe:
			typeof transcribeResult === 'string'
				? vi.fn().mockResolvedValue(transcribeResult)
				: vi.fn().mockRejectedValue(transcribeResult),
		getTokenUsage: vi.fn().mockReturnValue({
			cachedContentTokenCount: 0,
			candidatesTokenCount: 5,
			promptTokenCount: 3,
			thoughtsTokenCount: 0,
			toolUsePromptTokenCount: 0,
			totalTokenCount: 8
		})
	};
}

function createMockTTSExecutor() {
	return {
		resetTokenUsage: vi.fn(),
		synthesize: vi.fn().mockResolvedValue({
			audioBase64: 'base64-audio-data',
			mimeType: 'audio/wav'
		}),
		getTokenUsage: vi.fn().mockReturnValue({
			cachedContentTokenCount: 0,
			candidatesTokenCount: 10,
			promptTokenCount: 5,
			thoughtsTokenCount: 0,
			toolUsePromptTokenCount: 0,
			totalTokenCount: 15
		})
	};
}

function createMockWalletRepo(): IWalletRepository {
	return {
		getWallet: vi.fn().mockResolvedValue(null),
		createWallet: vi.fn(),
		updateWallet: vi.fn(),
		incrementSpend: vi.fn(),
		getWalletStatus: vi.fn().mockResolvedValue(null)
	};
}

async function extractResponseBody(response: Response): Promise<any> {
	return JSON.parse(await response.text());
}

describe('ConversationService.addTurn – ASR error handling', () => {
	const user = { uid: 'user-1', email: 'test@example.com', emailVerified: true };

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('returns 400 "No speech detected" when transcription is empty', async () => {
		const repo = createMockRepo();
		const gateway = createMockLLMGateway();
		const service = new ConversationService(repo, gateway, createMockWalletRepo());

		// ASR returns empty/whitespace-only text
		mockedGetASRExecutor.mockReturnValue(createMockASRExecutor('   ') as any);

		try {
			await service.addTurn(user, 'conv-1', {
				audioBase64: 'dGVzdA==',
				audioMimeType: 'audio/webm'
			});
			expect.unreachable('Should have thrown');
		} catch (error) {
			expect(error).toBeInstanceOf(Response);
			const response = error as Response;
			expect(response.status).toBe(400);
			const body = await extractResponseBody(response);
			expect(body.error).toContain('No speech detected');
		}
	});

	it('returns 500 "Failed to transcribe" when ASR throws a non-Response error', async () => {
		const repo = createMockRepo();
		const gateway = createMockLLMGateway();
		const service = new ConversationService(repo, gateway, createMockWalletRepo());

		// ASR throws a regular Error (e.g., API failure)
		mockedGetASRExecutor.mockReturnValue(
			createMockASRExecutor(new Error('Gemini API connection failed')) as any
		);

		try {
			await service.addTurn(user, 'conv-1', {
				audioBase64: 'dGVzdA==',
				audioMimeType: 'audio/webm'
			});
			expect.unreachable('Should have thrown');
		} catch (error) {
			expect(error).toBeInstanceOf(Response);
			const response = error as Response;
			expect(response.status).toBe(500);
			const body = await extractResponseBody(response);
			expect(body.error).toContain('Failed to transcribe audio');
		}
	});

	it('processes audio successfully when ASR returns valid text', async () => {
		const repo = createMockRepo();
		const gateway = createMockLLMGateway();
		const service = new ConversationService(repo, gateway, createMockWalletRepo());

		mockedGetASRExecutor.mockReturnValue(createMockASRExecutor('Hello world') as any);
		mockedGetTTSExecutor.mockReturnValue(createMockTTSExecutor() as any);

		const result = await service.addTurn(user, 'conv-1', {
			audioBase64: 'dGVzdA==',
			audioMimeType: 'audio/webm'
		});

		expect(result.text).toBe('AI response');
		expect(result.audio).toBe('base64-audio-data');
		expect(result.audioMimeType).toBe('audio/wav');

		// Verify ASR was called with correct params
		const asrExecutor = mockedGetASRExecutor.mock.results[0].value;
		expect(asrExecutor.transcribe).toHaveBeenCalledWith('dGVzdA==', 'audio/webm');

		// Verify LLM gateway received transcribed text
		expect(gateway.process).toHaveBeenCalledWith(
			expect.objectContaining({ userInputText: 'Hello world' })
		);
	});

	it('uses the course wallet API key for ASR, LLM, and TTS when available', async () => {
		const repo = createMockRepo();
		const gateway = createMockLLMGateway();
		const walletRepository = createMockWalletRepo();
		walletRepository.getWallet = vi.fn().mockResolvedValue({
			status: 'active',
			apiKey: 'course-api-key'
		} as any);
		const service = new ConversationService(repo, gateway, walletRepository, 'global-api-key');

		mockedGetASRExecutor.mockReturnValue(createMockASRExecutor('Hello world') as any);
		mockedGetTTSExecutor.mockReturnValue(createMockTTSExecutor() as any);

		await service.addTurn(user, 'conv-1', {
			audioBase64: 'dGVzdA==',
			audioMimeType: 'audio/webm'
		});

		expect(mockedGetASRExecutor).toHaveBeenCalledWith('course-api-key');
		expect(gateway.process).toHaveBeenCalledWith(
			expect.objectContaining({ apiKey: 'course-api-key', userInputText: 'Hello world' })
		);
		expect(mockedGetTTSExecutor).toHaveBeenCalledWith('course-api-key');
	});

	it('falls back to the configured global API key when no course wallet key exists', async () => {
		const repo = createMockRepo();
		const gateway = createMockLLMGateway();
		const service = new ConversationService(
			repo,
			gateway,
			createMockWalletRepo(),
			'global-api-key'
		);

		mockedGetASRExecutor.mockReturnValue(createMockASRExecutor('Hello world') as any);
		mockedGetTTSExecutor.mockReturnValue(createMockTTSExecutor() as any);

		await service.addTurn(user, 'conv-1', {
			audioBase64: 'dGVzdA==',
			audioMimeType: 'audio/webm'
		});

		expect(mockedGetASRExecutor).toHaveBeenCalledWith('global-api-key');
		expect(gateway.process).toHaveBeenCalledWith(
			expect.objectContaining({ apiKey: 'global-api-key', userInputText: 'Hello world' })
		);
		expect(mockedGetTTSExecutor).toHaveBeenCalledWith('global-api-key');
	});
});

describe('ConversationService.addTurn – conversation completion', () => {
	const user = { uid: 'user-1', email: 'test@example.com', emailVerified: true };

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('submits and closes the conversation when dialogue stage reaches ended even if ended flag is false', async () => {
		const repo = createMockRepo({
			getSubmission: vi.fn().mockResolvedValue(createMockSubmission())
		});
		const gateway = createMockLLMGateway();
		vi.mocked(gateway.process).mockResolvedValue({
			aiMessage: 'Final AI response',
			ended: false,
			stanceSnapshot: undefined,
			updatedState: { stage: DialogueStage.ENDED } as never,
			assessment: {
				dimensions: {
					argumentQuality: { score: 4, feedback: 'Strong reasoning' },
					criticalThinking: { score: 4, feedback: 'Thoughtful analysis' },
					principleExtraction: { score: 4, feedback: 'Clear principle' },
					openness: { score: 4, feedback: 'Shows openness' },
					coherence: { score: 4, feedback: 'Well structured' }
				},
				overallScore: 4,
				overallFeedback: 'Good work',
				generatedAt: Date.now()
			},
			assessmentError: undefined,
			tokenUsage: {
				cachedContentTokenCount: 0,
				candidatesTokenCount: 10,
				promptTokenCount: 5,
				thoughtsTokenCount: 0,
				toolUsePromptTokenCount: 0,
				inputTokenCount: 5,
				outputTokenCount: 10,
				totalTokenCount: 15
			}
		});
		const service = new ConversationService(repo, gateway, createMockWalletRepo());

		mockedGetTTSExecutor.mockReturnValue(createMockTTSExecutor() as any);

		const result = await service.addTurn(user, 'conv-1', {
			text: 'Here is my final answer'
		});

		expect(result.conversationEnded).toBe(true);
		expect(repo.saveSubmission).toHaveBeenCalledWith(
			'assignment-1',
			'user-1',
			expect.objectContaining({
				state: 'submitted',
				assessment: expect.objectContaining({
					overallScore: 4,
					overallFeedback: 'Good work'
				}),
				assessmentError: null
			})
		);
		expect(repo.updateConversation).toHaveBeenCalledWith(
			'conv-1',
			expect.objectContaining({ state: 'closed' })
		);
	});

	it('still reports completion when ended flag is true', async () => {
		const repo = createMockRepo({
			getSubmission: vi.fn().mockResolvedValue(createMockSubmission())
		});
		const gateway = createMockLLMGateway();
		vi.mocked(gateway.process).mockResolvedValue({
			aiMessage: 'Final AI response',
			ended: true,
			stanceSnapshot: undefined,
			updatedState: { stage: DialogueStage.CLOSURE } as never,
			assessment: undefined,
			assessmentError: undefined,
			tokenUsage: {
				cachedContentTokenCount: 0,
				candidatesTokenCount: 10,
				promptTokenCount: 5,
				thoughtsTokenCount: 0,
				toolUsePromptTokenCount: 0,
				inputTokenCount: 5,
				outputTokenCount: 10,
				totalTokenCount: 15
			}
		});
		const service = new ConversationService(repo, gateway, createMockWalletRepo());

		mockedGetTTSExecutor.mockReturnValue(createMockTTSExecutor() as any);

		const result = await service.addTurn(user, 'conv-1', {
			text: 'Wrap this up'
		});

		expect(result.conversationEnded).toBe(true);
		expect(repo.saveSubmission).toHaveBeenCalledWith(
			'assignment-1',
			'user-1',
			expect.objectContaining({ state: 'submitted' })
		);
		expect(repo.updateConversation).toHaveBeenCalledWith(
			'conv-1',
			expect.objectContaining({ state: 'closed' })
		);
	});
});
