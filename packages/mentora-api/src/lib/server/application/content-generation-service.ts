import { EXECUTOR_MODEL, getContentExecutor } from '../llm/executors.js';
import { TOKEN_USAGE_FEATURES, createTokenUsageReport } from '../llm/token-usage.js';
import { flushLangfuse } from '../observability/langfuse.js';
import { createTrace } from '../observability/langfuse-observer.js';

export interface GenerateAssignmentContentMeta {
	userId?: string;
	assignmentId?: string;
}

export class ContentGenerationService {
	constructor(private readonly geminiApiKey?: string) {}

	async generateAssignmentContent(question: string, meta: GenerateAssignmentContentMeta = {}) {
		const trace = createTrace('content.generate', {
			userId: meta.userId,
			tags: ['content-generation'],
			metadata: {
				assignmentId: meta.assignmentId ?? '',
				questionLength: String(question.length)
			},
			input: { question }
		});

		try {
			return await trace.run(async (rootSpan) => {
				const contentExecutor = getContentExecutor(this.geminiApiKey);
				contentExecutor.resetTokenUsage();
				const generatedContent = await contentExecutor.generateContent(question, rootSpan);
				rootSpan.setIO({
					input: { question },
					output: { content: generatedContent }
				});
				const tokenUsage = createTokenUsageReport([
					{
						feature: TOKEN_USAGE_FEATURES.ASSIGNMENT_CONTENT_GENERATION,
						usage: contentExecutor.getTokenUsage()
					}
				]);

				return {
					content: generatedContent,
					tokenUsage: {
						byFeature: tokenUsage.byFeature,
						totals: tokenUsage.totals,
						models: {
							[TOKEN_USAGE_FEATURES.ASSIGNMENT_CONTENT_GENERATION]: EXECUTOR_MODEL.CONTENT
						}
					}
				};
			});
		} finally {
			await flushLangfuse();
		}
	}
}
