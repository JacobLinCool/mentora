import type { Firestore } from 'fires2rest';
import { extractConversationSummary, processWithLLM } from '../../llm/llm-service.js';

type ProcessWithLLMResult = Awaited<ReturnType<typeof processWithLLM>>;
type ConversationSummary = ReturnType<typeof extractConversationSummary>;

export interface IConversationLLMGateway {
	process(params: {
		conversationId: string;
		userId: string;
		userInputText: string;
		question: string;
		prompt: string;
	}): Promise<ProcessWithLLMResult>;
	extractSummary(result: ProcessWithLLMResult): ConversationSummary;
}

export class FirestoreConversationLLMGateway implements IConversationLLMGateway {
	constructor(private readonly firestore: Firestore) {}

	async process(params: {
		conversationId: string;
		userId: string;
		userInputText: string;
		question: string;
		prompt: string;
	}): Promise<ProcessWithLLMResult> {
		return processWithLLM(
			this.firestore,
			params.conversationId,
			params.userId,
			params.userInputText,
			params.question,
			params.prompt
		);
	}

	extractSummary(result: ProcessWithLLMResult) {
		return extractConversationSummary(result.updatedState);
	}
}
