import { randomUUID } from 'node:crypto';
import {
	type Assignment,
	type Conversation,
	type MessageStance,
	type Submission,
	type TokenUsageBreakdown,
	type TokenUsageTotals,
	type Turn
} from 'mentora-firebase';
import type { CreateConversationResult } from '../../contracts/api.js';
import { EXECUTOR_MODEL, getASRExecutor, getTTSExecutor } from '../llm/executors.js';
import {
	TOKEN_USAGE_FEATURES,
	createTokenUsageReport,
	mergeTokenUsageReports
} from '../llm/token-usage.js';
import type { TokenUsageReport } from '../llm/token-usage.js';
import { errorResponse, HttpStatus, ServerErrorCode, type AuthContext } from '../types.js';
import type { IConversationRepository } from '../repositories/ports/conversation-repository.js';
import type { IWalletRepository } from '../repositories/ports/wallet-repository.js';
import { calculateReportCostUsd } from '../llm/pricing.js';
import { flushLangfuse } from '../observability/langfuse.js';
import { createTrace } from '../observability/langfuse-observer.js';
import type { IConversationLLMGateway } from './gateways/conversation-llm-gateway.js';

type AddTurnInput = { text: string } | { audioBase64: string; audioMimeType: string };

type CreateConversationServiceResult = CreateConversationResult & { status: number };

function ensureSubmissionWindow(assignment: Assignment, submittedAt: number): void {
	if (assignment.dueAt != null && submittedAt > assignment.dueAt && !assignment.allowLate) {
		throw errorResponse(
			'Assignment due date has passed',
			HttpStatus.FORBIDDEN,
			ServerErrorCode.PERMISSION_DENIED
		);
	}
}

function hasTokenUsage(usage: TokenUsageTotals): boolean {
	return usage.totalTokenCount > 0 || usage.inputTokenCount > 0 || usage.outputTokenCount > 0;
}

function toTurnTokenUsage(report: TokenUsageReport): TokenUsageBreakdown | null {
	if (!hasTokenUsage(report.totals)) {
		return null;
	}
	return {
		byFeature: report.byFeature,
		totals: report.totals
	};
}

function getTokenUsageModels(report: TokenUsageReport): Record<string, string> {
	const models: Record<string, string> = {};
	if (report.byFeature[TOKEN_USAGE_FEATURES.CONVERSATION_ASR]) {
		models[TOKEN_USAGE_FEATURES.CONVERSATION_ASR] = EXECUTOR_MODEL.ASR;
	}
	if (report.byFeature[TOKEN_USAGE_FEATURES.CONVERSATION_LLM]) {
		models[TOKEN_USAGE_FEATURES.CONVERSATION_LLM] = EXECUTOR_MODEL.PROMPT;
	}
	if (report.byFeature[TOKEN_USAGE_FEATURES.CONVERSATION_TTS]) {
		models[TOKEN_USAGE_FEATURES.CONVERSATION_TTS] = EXECUTOR_MODEL.TTS;
	}
	return models;
}

export class ConversationService {
	constructor(
		private readonly conversationRepository: IConversationRepository,
		private readonly llmGateway: IConversationLLMGateway,
		private readonly walletRepository: IWalletRepository,
		private readonly geminiApiKey?: string
	) {}

	private async ensureSubmissionInProgress(assignment: Assignment, userId: string): Promise<void> {
		const existing = await this.conversationRepository.getSubmission(assignment.id, userId);
		if (existing?.state === 'in_progress') {
			return;
		}

		if (existing) {
			const restarted: Submission = {
				...existing,
				userId,
				state: 'in_progress',
				submittedAt: null,
				late: false,
				scoreCompletion: null,
				notes: null,
				assessment: null,
				assessmentError: null
			};
			await this.conversationRepository.saveSubmission(assignment.id, userId, restarted);
			return;
		}

		const submission: Submission = {
			userId,
			state: 'in_progress',
			startedAt: Date.now(),
			submittedAt: null,
			late: false,
			scoreCompletion: null,
			notes: null,
			assessment: null,
			assessmentError: null,
			totalSpentUsd: 0,
			budgetExhausted: false
		};
		await this.conversationRepository.saveSubmission(assignment.id, userId, submission);
	}

	private async submitSubmission(
		assignment: Assignment,
		userId: string,
		assessmentData?: { assessment?: unknown; assessmentError?: string }
	): Promise<void> {
		console.log('[ConversationService:submitSubmission]', {
			assignmentId: assignment.id,
			userId
		});
		const existing = await this.conversationRepository.getSubmission(assignment.id, userId);
		const submittedAt = Date.now();
		ensureSubmissionWindow(assignment, submittedAt);
		const isLate = assignment.dueAt != null && submittedAt > assignment.dueAt;

		let startedAt = submittedAt;
		let scoreCompletion: number | null = null;
		let notes: string | null = null;
		if (existing) {
			startedAt = existing.startedAt;
			scoreCompletion = existing.scoreCompletion ?? null;
			notes = existing.notes ?? null;
		}

		const submitted: Submission = {
			userId,
			state: 'submitted',
			startedAt,
			submittedAt,
			late: isLate,
			scoreCompletion,
			notes,
			assessment: (assessmentData?.assessment as Submission['assessment']) ?? null,
			assessmentError: assessmentData?.assessmentError ?? null,
			totalSpentUsd: existing?.totalSpentUsd ?? 0,
			budgetExhausted: existing?.budgetExhausted ?? false
		};
		await this.conversationRepository.saveSubmission(assignment.id, userId, submitted);
	}

	async createConversation(
		user: AuthContext,
		assignmentId: string
	): Promise<CreateConversationServiceResult> {
		const assignment = await this.conversationRepository.getAssignment(assignmentId);
		if (!assignment) {
			throw errorResponse('Assignment not found', HttpStatus.NOT_FOUND, ServerErrorCode.NOT_FOUND);
		}

		if (assignment.startAt > Date.now()) {
			throw errorResponse(
				'Assignment has not started yet',
				HttpStatus.FORBIDDEN,
				ServerErrorCode.PERMISSION_DENIED
			);
		}
		ensureSubmissionWindow(assignment, Date.now());

		if (assignment.courseId) {
			const membership = await this.conversationRepository.getMembership(
				assignment.courseId,
				user.uid
			);
			if (!membership || membership.status !== 'active') {
				throw errorResponse(
					'Not enrolled in this course',
					HttpStatus.FORBIDDEN,
					ServerErrorCode.PERMISSION_DENIED
				);
			}
		}

		const conversationId = `${user.uid}_${assignmentId}`;
		const existing = await this.conversationRepository.getConversation(conversationId);
		if (existing) {
			if (existing.state !== 'closed') {
				await this.ensureSubmissionInProgress(assignment, user.uid);
				return { id: conversationId, created: false, reopened: false, status: HttpStatus.OK };
			}
			if (!assignment.allowResubmit) {
				throw errorResponse(
					'Conversation completed and resubmission not allowed',
					HttpStatus.CONFLICT,
					ServerErrorCode.ALREADY_EXISTS
				);
			}

			const now = Date.now();
			await this.conversationRepository.updateConversation(conversationId, {
				state: 'awaiting_idea',
				lastActionAt: now,
				updatedAt: now
			});
			await this.conversationRepository.deleteConversationState(conversationId);
			await this.ensureSubmissionInProgress(assignment, user.uid);
			return { id: conversationId, created: false, reopened: true, status: HttpStatus.OK };
		}

		const now = Date.now();
		const conversation: Conversation = {
			assignmentId,
			userId: user.uid,
			state: 'awaiting_idea',
			lastActionAt: now,
			createdAt: now,
			updatedAt: now,
			turns: [],
			tokenUsage: null
		};
		await this.conversationRepository.createConversation(conversationId, conversation);
		await this.ensureSubmissionInProgress(assignment, user.uid);
		return { id: conversationId, created: true, reopened: false, status: HttpStatus.CREATED };
	}

	async endConversation(user: AuthContext, conversationId: string): Promise<void> {
		const conversation = await this.conversationRepository.getConversation(conversationId);
		if (!conversation) {
			throw errorResponse(
				'Conversation not found',
				HttpStatus.NOT_FOUND,
				ServerErrorCode.NOT_FOUND
			);
		}
		if (conversation.userId !== user.uid) {
			throw errorResponse(
				'Not authorized',
				HttpStatus.FORBIDDEN,
				ServerErrorCode.PERMISSION_DENIED
			);
		}
		if (conversation.state === 'closed') {
			throw errorResponse(
				'Conversation already closed',
				HttpStatus.BAD_REQUEST,
				ServerErrorCode.INVALID_INPUT
			);
		}

		const assignment = await this.conversationRepository.getAssignment(conversation.assignmentId);
		if (!assignment) {
			throw errorResponse('Assignment not found', HttpStatus.NOT_FOUND, ServerErrorCode.NOT_FOUND);
		}
		await this.submitSubmission(assignment, user.uid);
		const now = Date.now();
		await this.conversationRepository.updateConversation(conversationId, {
			state: 'closed',
			lastActionAt: now,
			updatedAt: now
		});
	}

	async addTurn(user: AuthContext, conversationId: string, input: AddTurnInput) {
		const conversation = await this.conversationRepository.getConversation(conversationId);
		if (!conversation) {
			throw errorResponse(
				'Conversation not found',
				HttpStatus.NOT_FOUND,
				ServerErrorCode.NOT_FOUND
			);
		}
		if (conversation.userId !== user.uid) {
			throw errorResponse(
				'Not authorized',
				HttpStatus.FORBIDDEN,
				ServerErrorCode.PERMISSION_DENIED
			);
		}
		if (conversation.state === 'closed') {
			throw errorResponse(
				'Conversation is closed',
				HttpStatus.BAD_REQUEST,
				ServerErrorCode.INVALID_INPUT
			);
		}

		const assignment = await this.conversationRepository.getAssignment(conversation.assignmentId);
		if (!assignment) {
			throw errorResponse('Assignment not found', HttpStatus.NOT_FOUND, ServerErrorCode.NOT_FOUND);
		}
		ensureSubmissionWindow(assignment, Date.now());

		const inputType = 'audioBase64' in input ? 'audio' : 'text';
		const trace = createTrace('conversation.addTurn', {
			userId: user.uid,
			sessionId: conversationId,
			tags: ['conversation', `input:${inputType}`],
			metadata: {
				assignmentId: assignment.id,
				courseId: assignment.courseId ?? '',
				inputType
			}
		});

		try {
			return await trace.run((rootSpan) =>
				this.addTurnInternal(user, conversationId, input, conversation, assignment, rootSpan)
			);
		} finally {
			await flushLangfuse();
		}
	}

	private async addTurnInternal(
		user: AuthContext,
		conversationId: string,
		input: AddTurnInput,
		conversation: Conversation,
		assignment: Assignment,
		traceSpan: import('mentora-ai').LLMSpan
	) {
		// Budget pre-checks
		let apiKey: string | undefined;
		if (assignment.courseId) {
			const wallet = await this.walletRepository.getWallet(assignment.courseId);
			if (wallet) {
				if (wallet.status === 'suspended') {
					throw errorResponse(
						'Course budget exhausted. Please contact your instructor.',
						HttpStatus.FORBIDDEN,
						ServerErrorCode.PERMISSION_DENIED
					);
				}
				if (wallet.status === 'invalid_key') {
					throw errorResponse(
						'Course is temporarily unavailable. Please contact your instructor.',
						HttpStatus.FORBIDDEN,
						ServerErrorCode.PERMISSION_DENIED
					);
				}
				apiKey = wallet.apiKey;
			}

			// Check student budget
			if (assignment.studentBudgetUsd != null) {
				const currentSubmission = await this.conversationRepository.getSubmission(
					assignment.id,
					user.uid
				);
				if (currentSubmission && currentSubmission.totalSpentUsd >= assignment.studentBudgetUsd) {
					// Budget exhausted - force end the conversation
					await this.submitSubmission(assignment, user.uid);
					const endNow = Date.now();
					await this.conversationRepository.updateConversation(conversationId, {
						state: 'closed',
						lastActionAt: endNow,
						updatedAt: endNow
					});
					throw errorResponse(
						'You have used up your budget for this assignment.',
						HttpStatus.FORBIDDEN,
						ServerErrorCode.PERMISSION_DENIED
					);
				}
			}
		}

		const requestApiKey = apiKey ?? this.geminiApiKey;

		const now = Date.now();
		const userTurnId = randomUUID();
		let asrUsageReport = createTokenUsageReport([]);
		let llmUsageReport = createTokenUsageReport([]);
		let ttsUsageReport = createTokenUsageReport([]);
		let userInputText: string;

		if ('audioBase64' in input) {
			const asrSpan = traceSpan.child('asr');
			try {
				const asrExecutor = getASRExecutor(requestApiKey);
				asrExecutor.resetTokenUsage();
				userInputText = await asrExecutor.transcribe(
					input.audioBase64,
					input.audioMimeType,
					asrSpan
				);
				userInputText = userInputText.trim();
				if (!userInputText) {
					throw errorResponse(
						'No speech detected in the audio. Please try again or use text input.',
						HttpStatus.BAD_REQUEST,
						ServerErrorCode.INVALID_INPUT
					);
				}
				asrUsageReport = createTokenUsageReport([
					{
						feature: TOKEN_USAGE_FEATURES.CONVERSATION_ASR,
						usage: asrExecutor.getTokenUsage()
					}
				]);
			} catch (error) {
				asrSpan.end({ error });
				if (error instanceof Response) throw error;
				throw errorResponse(
					'Failed to transcribe audio. Please try again or use text input.',
					HttpStatus.INTERNAL_SERVER_ERROR,
					ServerErrorCode.INTERNAL_ERROR
				);
			}
			asrSpan.end();
		} else {
			userInputText = input.text;
		}

		let llmResult: Awaited<ReturnType<IConversationLLMGateway['process']>>;
		try {
			llmResult = await this.llmGateway.process({
				conversationId,
				userId: user.uid,
				userInputText,
				question: assignment.question || '',
				prompt: assignment.prompt || '',
				apiKey: requestApiKey,
				parent: traceSpan
			});
		} catch (error) {
			if (
				error instanceof Error &&
				assignment.courseId &&
				apiKey &&
				(error.message.includes('401') ||
					error.message.includes('403') ||
					error.message.includes('API_KEY_INVALID'))
			) {
				await this.walletRepository.updateWallet(assignment.courseId, {
					status: 'invalid_key',
					updatedAt: Date.now()
				});
			}
			throw error;
		}

		console.log(
			'[ConversationService:addTurn] after processWithLLM (dialogue state already saved)',
			{
				conversationId,
				assignmentId: assignment.id,
				llmEnded: llmResult.ended,
				dialogueStage: llmResult.updatedState.stage
			}
		);

		// Set meaningful trace I/O so the trace is readable in the Langfuse UI:
		// the actual student input and the AI's reply (not internal request args).
		traceSpan.setIO({
			input: { studentMessage: userInputText },
			output: { aiMessage: llmResult.aiMessage, ended: llmResult.ended }
		});

		llmUsageReport = createTokenUsageReport([
			{
				feature: TOKEN_USAGE_FEATURES.CONVERSATION_LLM,
				usage: llmResult.tokenUsage
			}
		]);

		const aiTurnId = randomUUID();
		let aiAudioBase64: string;
		let aiAudioMimeType: string;
		const ttsSpan = traceSpan.child('tts');
		try {
			const ttsExecutor = getTTSExecutor(requestApiKey);
			ttsExecutor.resetTokenUsage();
			const synthesizedAudio = await ttsExecutor.synthesize(llmResult.aiMessage, ttsSpan);
			aiAudioBase64 = synthesizedAudio.audioBase64;
			aiAudioMimeType = synthesizedAudio.mimeType;
			ttsUsageReport = createTokenUsageReport([
				{
					feature: TOKEN_USAGE_FEATURES.CONVERSATION_TTS,
					usage: ttsExecutor.getTokenUsage()
				}
			]);
		} catch (error) {
			ttsSpan.end({ error });
			if (
				error instanceof Error &&
				assignment.courseId &&
				apiKey &&
				(error.message.includes('401') ||
					error.message.includes('403') ||
					error.message.includes('API_KEY_INVALID'))
			) {
				await this.walletRepository.updateWallet(assignment.courseId, {
					status: 'invalid_key',
					updatedAt: Date.now()
				});
			}
			console.error(
				'[ConversationService:addTurn] TTS failed after LLM (submission not updated yet)',
				{
					conversationId,
					assignmentId: assignment.id,
					llmEnded: llmResult.ended,
					dialogueStage: llmResult.updatedState.stage
				}
			);
			throw errorResponse(
				'Failed to synthesize speech. Please try again.',
				HttpStatus.INTERNAL_SERVER_ERROR,
				ServerErrorCode.INTERNAL_ERROR
			);
		}
		ttsSpan.end();

		const finalNow = Date.now();
		const aiTurnUsageReport = mergeTokenUsageReports(llmUsageReport, ttsUsageReport);
		const requestUsageReport = mergeTokenUsageReports(asrUsageReport, aiTurnUsageReport);
		const userTurnTokenUsage = toTurnTokenUsage(asrUsageReport);
		const aiTurnTokenUsage = toTurnTokenUsage(aiTurnUsageReport);

		const userTurn: Turn = {
			id: userTurnId,
			type: 'idea',
			text: userInputText,
			analysis: llmResult.stanceSnapshot
				? { stance: llmResult.stanceSnapshot.stance as MessageStance }
				: null,
			pendingStartAt: null,
			tokenUsage: userTurnTokenUsage,
			createdAt: now
		};
		const aiTurn: Turn = {
			id: aiTurnId,
			type: 'followup',
			text: llmResult.aiMessage,
			analysis: null,
			pendingStartAt: null,
			tokenUsage: aiTurnTokenUsage,
			createdAt: finalNow
		};

		try {
			await this.conversationRepository.appendTurns({
				conversationId,
				userId: user.uid,
				turns: [userTurn, aiTurn],
				finalNow,
				usageReport: requestUsageReport
			});
		} catch (error) {
			console.error('[ConversationService:addTurn] appendTurns failed', {
				conversationId,
				assignmentId: assignment.id,
				llmEnded: llmResult.ended,
				dialogueStage: llmResult.updatedState.stage,
				error: error instanceof Error ? error.message : String(error)
			});
			if (error instanceof Error) {
				if (error.message === 'Conversation not found') {
					throw errorResponse(
						'Conversation not found',
						HttpStatus.NOT_FOUND,
						ServerErrorCode.NOT_FOUND
					);
				}
				if (error.message === 'Not authorized') {
					throw errorResponse(
						'Not authorized',
						HttpStatus.FORBIDDEN,
						ServerErrorCode.PERMISSION_DENIED
					);
				}
				if (error.message === 'Conversation is closed') {
					throw errorResponse(
						'Conversation is closed',
						HttpStatus.BAD_REQUEST,
						ServerErrorCode.INVALID_INPUT
					);
				}
			}
			throw error;
		}

		console.log('[ConversationService:addTurn] after appendTurns', {
			conversationId,
			assignmentId: assignment.id,
			llmEnded: llmResult.ended,
			dialogueStage: llmResult.updatedState.stage,
			stageEndedButNotClosed: llmResult.updatedState.stage === 'ended' && !llmResult.ended
		});

		const conversationShouldClose = llmResult.ended || llmResult.updatedState.stage === 'ended';

		// Post-turn: calculate and record spend
		const turnCostUsd = calculateReportCostUsd(
			requestUsageReport.byFeature,
			getTokenUsageModels(requestUsageReport)
		);

		if (assignment.courseId && turnCostUsd > 0) {
			// Increment wallet spend
			await this.walletRepository.incrementSpend(assignment.courseId, turnCostUsd);

			// Increment submission spend
			await this.conversationRepository.incrementSubmissionSpend(
				assignment.id,
				user.uid,
				turnCostUsd
			);

			// Post-check: wallet limit
			const walletStatus = await this.walletRepository.getWalletStatus(assignment.courseId);
			if (walletStatus && walletStatus.totalSpentUsd >= walletStatus.spendingLimitUsd) {
				await this.walletRepository.updateWallet(assignment.courseId, {
					status: 'suspended',
					updatedAt: Date.now()
				});
			}

			// Post-check: student budget
			if (assignment.studentBudgetUsd != null) {
				const updatedSubmission = await this.conversationRepository.getSubmission(
					assignment.id,
					user.uid
				);
				if (updatedSubmission && updatedSubmission.totalSpentUsd >= assignment.studentBudgetUsd) {
					await this.conversationRepository.saveSubmission(assignment.id, user.uid, {
						...updatedSubmission,
						budgetExhausted: true
					});
				}
			}
		}

		if (conversationShouldClose) {
			console.log('[ConversationService:addTurn] closing conversation + submitting', {
				conversationId,
				assignmentId: assignment.id,
				llmEnded: llmResult.ended,
				dialogueStage: llmResult.updatedState.stage
			});
			await this.submitSubmission(assignment, user.uid, {
				assessment: llmResult.assessment ?? undefined,
				assessmentError: llmResult.assessmentError
			});
			const closeNow = Date.now();
			await this.conversationRepository.updateConversation(conversationId, {
				state: 'closed',
				lastActionAt: closeNow,
				updatedAt: closeNow
			});
		}

		const summary = this.llmGateway.extractSummary(llmResult);
		return {
			text: llmResult.aiMessage,
			audio: aiAudioBase64,
			audioMimeType: aiAudioMimeType,
			conversationId,
			userTurnId,
			aiTurnId,
			conversationEnded: conversationShouldClose,
			stage: summary.stage,
			stance: summary.currentStance,
			principle: summary.currentPrinciple,
			tokenUsage: {
				byFeature: requestUsageReport.byFeature,
				totals: requestUsageReport.totals,
				models: getTokenUsageModels(requestUsageReport)
			}
		};
	}
}
