/**
 * Test Fixtures for API Explorer
 *
 * Predefined test data and sample configurations
 * for quick API testing without manual ID entry.
 */

export interface TestFixture {
	id: string;
	name: string;
	description: string;
	data: Record<string, unknown>;
}

/**
 * Sample course data for testing
 */
export const sampleCourses: TestFixture[] = [
	{
		id: 'demo-course-philosophy',
		name: 'Introduction to Philosophy',
		description: 'Demo course for testing philosophical discussions',
		data: {
			name: 'Introduction to Philosophy',
			description: 'Explore fundamental questions about existence, knowledge, and ethics',
			isActive: true
		}
	},
	{
		id: 'demo-course-critical-thinking',
		name: 'Critical Thinking 101',
		description: 'Demo course for logical reasoning exercises',
		data: {
			name: 'Critical Thinking 101',
			description: 'Learn to analyze arguments and identify fallacies',
			isActive: true
		}
	}
];

/**
 * Sample topic data for testing
 */
export const sampleTopics: TestFixture[] = [
	{
		id: 'demo-topic-ethics',
		name: 'Ethical Dilemmas',
		description: 'Discussion of moral philosophy',
		data: {
			name: 'Ethical Dilemmas',
			description: 'Explore classic ethical scenarios and moral reasoning',
			sortOrder: 1
		}
	},
	{
		id: 'demo-topic-epistemology',
		name: 'Knowledge & Truth',
		description: 'Epistemological questions',
		data: {
			name: 'Knowledge & Truth',
			description: 'What can we know and how can we know it?',
			sortOrder: 2
		}
	}
];

/**
 * Sample assignment configurations
 */
export const sampleAssignments: TestFixture[] = [
	{
		id: 'demo-assignment-socratic',
		name: 'Socratic Dialogue Practice',
		description: 'Default Socratic dialogue assignment',
		data: {
			title: 'Explore a Philosophical Question',
			prompt:
				'Choose a topic that interests you and engage in a Socratic dialogue to explore it deeply.',
			aiConfig: {
				persona: 'socratic-default',
				maxTurns: 20,
				dialecticalConfig: {
					enabledStrategies: ['clarify', 'challenge', 'devils_advocate'],
					preferredStyle: 'balanced'
				}
			},
			isActive: true
		}
	},
	{
		id: 'demo-assignment-debate',
		name: 'Debate Partner',
		description: 'AI takes opposing view',
		data: {
			title: 'Defend Your Position',
			prompt: 'Present an argument on any topic. The AI will challenge your reasoning.',
			aiConfig: {
				persona: 'debate-partner',
				maxTurns: 15,
				dialecticalConfig: {
					enabledStrategies: ['challenge', 'devils_advocate'],
					preferredStyle: 'aggressive'
				}
			},
			isActive: true
		}
	}
];

/**
 * Sample prompt templates for testing LLM responses
 */
export const samplePrompts = {
	socraticDefault: `You are a Socratic dialogue AI tutor. Your goal is to help students think critically about complex topics through thoughtful questioning.

Guidelines:
- Ask probing questions rather than giving direct answers
- Challenge assumptions and encourage deeper thinking
- Use one of these dialectical strategies: clarify, challenge, or devil's advocate
- Keep responses concise but thought-provoking`,

	philosophyGuide: `You are a philosophy guide leading a Socratic dialogue. Help students explore fundamental questions about existence, knowledge, ethics, and meaning.

Your approach:
- Use the Socratic method of questioning
- Reference relevant philosophical traditions when appropriate
- Help students recognize logical fallacies in their reasoning
- Encourage students to define key terms precisely`,

	criticalThinking: `You are a critical thinking coach. Your role is to help students develop stronger analytical skills through structured questioning.

Focus areas:
- Identify hidden assumptions
- Evaluate evidence quality
- Consider alternative perspectives
- Recognize cognitive biases
- Improve logical reasoning`,

	debatePartner: `You are a skilled debate partner. Take the opposing position to whatever the student argues, helping them strengthen their arguments.

Rules:
- Always argue the opposite position respectfully
- Point out weaknesses in their reasoning
- Provide counterarguments and counter-examples
- Help them anticipate objections to their position`
};

/**
 * Sample student messages for testing
 */
export const sampleStudentMessages = [
	{
		text: 'I believe technology is making us more connected but less human.',
		category: 'Technology & Society'
	},
	{
		text: 'Democracy is the best form of government for all societies.',
		category: 'Political Philosophy'
	},
	{
		text: 'Artificial intelligence will eventually replace most human jobs.',
		category: 'AI & Future'
	},
	{
		text: 'Climate change is primarily caused by human activities.',
		category: 'Science & Policy'
	},
	{
		text: 'Social media does more harm than good to society.',
		category: 'Technology & Society'
	},
	{
		text: 'Free will is an illusion - our choices are determined by prior causes.',
		category: 'Philosophy of Mind'
	},
	{
		text: 'Morality is subjective and there are no universal ethical truths.',
		category: 'Ethics'
	},
	{
		text: 'Money cannot buy happiness.',
		category: 'Well-being'
	}
];

/**
 * Quick-start configurations
 */
export interface QuickStartConfig {
	id: string;
	name: string;
	description: string;
	courseId?: string;
	topicId?: string;
	assignmentId?: string;
	systemPrompt: string;
	studentMessage: string;
	strategy: 'clarify' | 'challenge' | 'devils_advocate';
}

export const quickStartConfigs: QuickStartConfig[] = [
	{
		id: 'philosophy-ethics',
		name: 'Philosophy - Ethics',
		description: 'Explore ethical dilemmas with Socratic method',
		systemPrompt: samplePrompts.philosophyGuide,
		studentMessage: 'I think lying is always wrong, no matter the circumstances.',
		strategy: 'challenge'
	},
	{
		id: 'tech-society',
		name: 'Technology & Society',
		description: 'Discuss technology impact on humanity',
		systemPrompt: samplePrompts.criticalThinking,
		studentMessage: 'I believe technology is making us more connected but less human.',
		strategy: 'clarify'
	},
	{
		id: 'debate-ai',
		name: 'Debate: AI Future',
		description: 'Debate about AI and jobs',
		systemPrompt: samplePrompts.debatePartner,
		studentMessage: 'Artificial intelligence will eventually replace most human jobs.',
		strategy: 'devils_advocate'
	},
	{
		id: 'free-will',
		name: 'Philosophy of Mind',
		description: 'Explore questions of free will',
		systemPrompt: samplePrompts.socraticDefault,
		studentMessage: 'Free will is an illusion - our choices are determined by prior causes.',
		strategy: 'challenge'
	}
];

/**
 * Get a random sample message
 */
export function getRandomSampleMessage(): (typeof sampleStudentMessages)[0] {
	return sampleStudentMessages[Math.floor(Math.random() * sampleStudentMessages.length)];
}

/**
 * Generate a demo conversation ID
 */
export function generateDemoId(prefix: string = 'demo'): string {
	return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
