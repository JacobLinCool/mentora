import { randomUUID } from 'node:crypto';
import {
	type Assignment,
	type Conversation,
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
		private readonly llmGateway: IConversationLLMGateway
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
				notes: null
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
			notes: null
		};
		await this.conversationRepository.saveSubmission(assignment.id, userId, submission);
	}

	private async submitSubmission(assignment: Assignment, userId: string): Promise<void> {
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
			notes
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

		const now = Date.now();
		const userTurnId = randomUUID();
		let asrUsageReport = createTokenUsageReport([]);
		let llmUsageReport = createTokenUsageReport([]);
		let ttsUsageReport = createTokenUsageReport([]);
		let userInputText: string;

		if ('audioBase64' in input) {
			try {
				const asrExecutor = getASRExecutor();
				asrExecutor.resetTokenUsage();
				userInputText = await asrExecutor.transcribe(input.audioBase64, input.audioMimeType);
				asrUsageReport = createTokenUsageReport([
					{
						feature: TOKEN_USAGE_FEATURES.CONVERSATION_ASR,
						usage: asrExecutor.getTokenUsage()
					}
				]);
			} catch {
				throw errorResponse(
					'Failed to transcribe audio. Please try again or use text input.',
					HttpStatus.INTERNAL_SERVER_ERROR,
					ServerErrorCode.INTERNAL_ERROR
				);
			}
		} else {
			userInputText = input.text;
		}

		const assignment = await this.conversationRepository.getAssignment(conversation.assignmentId);
		if (!assignment) {
			throw errorResponse('Assignment not found', HttpStatus.NOT_FOUND, ServerErrorCode.NOT_FOUND);
		}
		ensureSubmissionWindow(assignment, Date.now());

		const llmResult = await this.llmGateway.process({
			conversationId,
			userId: user.uid,
			userInputText,
			question: assignment.question || '',
			prompt: assignment.prompt || ''
		});

		llmUsageReport = createTokenUsageReport([
			{
				feature: TOKEN_USAGE_FEATURES.CONVERSATION_LLM,
				usage: llmResult.tokenUsage
			}
		]);

		const aiTurnId = randomUUID();
		let aiAudioBase64: string;
		const aiAudioMimeType = 'audio/mp3';
		try {
			const ttsExecutor = getTTSExecutor();
			ttsExecutor.resetTokenUsage();
			aiAudioBase64 = await ttsExecutor.synthesize(llmResult.aiMessage);
			ttsUsageReport = createTokenUsageReport([
				{
					feature: TOKEN_USAGE_FEATURES.CONVERSATION_TTS,
					usage: ttsExecutor.getTokenUsage()
				}
			]);
		} catch {
			throw errorResponse(
				'Failed to synthesize speech. Please try again.',
				HttpStatus.INTERNAL_SERVER_ERROR,
				ServerErrorCode.INTERNAL_ERROR
			);
		}

		const finalNow = Date.now();
		const aiTurnUsageReport = mergeTokenUsageReports(llmUsageReport, ttsUsageReport);
		const requestUsageReport = mergeTokenUsageReports(asrUsageReport, aiTurnUsageReport);
		const userTurnTokenUsage = toTurnTokenUsage(asrUsageReport);
		const aiTurnTokenUsage = toTurnTokenUsage(aiTurnUsageReport);

		const userTurn: Turn = {
			id: userTurnId,
			type: 'idea',
			text: userInputText,
			analysis: null,
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
				ended: llmResult.ended,
				finalNow,
				usageReport: requestUsageReport
			});
		} catch (error) {
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

		if (llmResult.ended) {
			await this.submitSubmission(assignment, user.uid);
		}

		const summary = this.llmGateway.extractSummary(llmResult);
		return {
			text: llmResult.aiMessage,
			audio: aiAudioBase64,
			audioMimeType: aiAudioMimeType,
			conversationId,
			userTurnId,
			aiTurnId,
			conversationEnded: llmResult.ended,
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
