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
 * Quick-start configurations for Prompt Lab
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
 * Conversation themes for Voice Chat
 * One-click setup with predefined topics, prompts, and starter questions
 */
export interface ConversationTheme {
	id: string;
	name: string;
	emoji: string;
	description: string;
	category: string;
	systemPrompt: string;
	starterQuestions: string[];
	suggestedStrategy: 'clarify' | 'challenge' | 'devils_advocate';
	difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const conversationThemes: ConversationTheme[] = [
	{
		id: 'ethics-trolley',
		name: '經典倫理困境',
		emoji: '🚃',
		description: '探討電車難題等經典道德哲學問題',
		category: '倫理學',
		systemPrompt: samplePrompts.philosophyGuide,
		starterQuestions: [
			'電車難題中，犧牲一人拯救五人是否符合道德？',
			'在緊急情況下說謊是否可以被接受？',
			'我們對陌生人是否有道德義務？'
		],
		suggestedStrategy: 'challenge',
		difficulty: 'intermediate'
	},
	{
		id: 'ai-ethics',
		name: 'AI 與未來工作',
		emoji: '🤖',
		description: '討論人工智慧對就業市場和社會的影響',
		category: '科技與社會',
		systemPrompt: samplePrompts.criticalThinking,
		starterQuestions: [
			'AI 會取代大部分的人類工作嗎？',
			'我們應該如何應對 AI 帶來的失業問題？',
			'AI 是否應該擁有法律權利？'
		],
		suggestedStrategy: 'devils_advocate',
		difficulty: 'intermediate'
	},
	{
		id: 'free-will',
		name: '自由意志之辯',
		emoji: '🧠',
		description: '探討人類是否真的擁有自由意志',
		category: '心靈哲學',
		systemPrompt: samplePrompts.socraticDefault,
		starterQuestions: [
			'我們的選擇是否真的自由，還是被過去所決定？',
			'如果沒有自由意志，道德責任還有意義嗎？',
			'量子力學的隨機性是否能拯救自由意志？'
		],
		suggestedStrategy: 'clarify',
		difficulty: 'advanced'
	},
	{
		id: 'social-media',
		name: '社群媒體利弊',
		emoji: '📱',
		description: '分析社群媒體對個人和社會的影響',
		category: '科技與社會',
		systemPrompt: samplePrompts.debatePartner,
		starterQuestions: [
			'社群媒體讓我們更親近還是更疏離？',
			'社群媒體是否應該為錯誤資訊負責？',
			'我們能否在不使用社群媒體的情況下保持社交聯繫？'
		],
		suggestedStrategy: 'devils_advocate',
		difficulty: 'beginner'
	},
	{
		id: 'climate-action',
		name: '氣候變遷與責任',
		emoji: '🌍',
		description: '討論氣候變遷的科學與政策問題',
		category: '科學與政策',
		systemPrompt: samplePrompts.criticalThinking,
		starterQuestions: [
			'個人行動對氣候變遷有多大影響？',
			'發展中國家是否應該承擔減排責任？',
			'科技能否解決氣候危機？'
		],
		suggestedStrategy: 'challenge',
		difficulty: 'intermediate'
	},
	{
		id: 'democracy-limits',
		name: '民主的界限',
		emoji: '🗳️',
		description: '探討民主制度的優勢與限制',
		category: '政治哲學',
		systemPrompt: samplePrompts.philosophyGuide,
		starterQuestions: [
			'民主是否適合所有文化和社會？',
			'多數決是否可能侵犯少數人權利？',
			'專家治理與民主如何平衡？'
		],
		suggestedStrategy: 'challenge',
		difficulty: 'advanced'
	},
	{
		id: 'happiness-money',
		name: '金錢與幸福',
		emoji: '💰',
		description: '探討財富與幸福感的關係',
		category: '幸福哲學',
		systemPrompt: samplePrompts.socraticDefault,
		starterQuestions: [
			'金錢真的買不到幸福嗎？',
			'財富增加後幸福感為何會停滯？',
			'追求財富與追求幸福是否矛盾？'
		],
		suggestedStrategy: 'clarify',
		difficulty: 'beginner'
	},
	{
		id: 'truth-relativism',
		name: '真理與相對主義',
		emoji: '🔍',
		description: '討論真理的本質與道德相對主義',
		category: '知識論',
		systemPrompt: samplePrompts.philosophyGuide,
		starterQuestions: [
			'是否存在客觀真理？',
			'不同文化的道德標準都同樣有效嗎？',
			'科學真理與道德真理有何不同？'
		],
		suggestedStrategy: 'challenge',
		difficulty: 'advanced'
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
