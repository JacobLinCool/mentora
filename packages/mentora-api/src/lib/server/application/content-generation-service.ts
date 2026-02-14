import { EXECUTOR_MODEL, getContentExecutor } from '../llm/executors.js';
import { TOKEN_USAGE_FEATURES, createTokenUsageReport } from '../llm/token-usage.js';

export class ContentGenerationService {
	async generateAssignmentContent(question: string) {
		const contentExecutor = getContentExecutor();
		contentExecutor.resetTokenUsage();
		const generatedContent = await contentExecutor.generateContent(question);
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
	}
}
