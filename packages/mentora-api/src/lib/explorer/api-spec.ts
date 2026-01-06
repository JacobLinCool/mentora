/**
 * API Specification Definitions
 * Used to auto-generate documentation and testing UI
 */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

export interface APIParameter {
	name: string;
	type: 'string' | 'number' | 'boolean' | 'object' | 'array';
	required: boolean;
	description: string;
	default?: unknown;
	enum?: string[];
	example?: unknown;
}

export interface APIEndpoint {
	method: HttpMethod;
	path: string;
	summary: string;
	description?: string;
	tags: string[];
	pathParams?: APIParameter[];
	queryParams?: APIParameter[];
	bodyParams?: APIParameter[];
	bodyExample?: Record<string, unknown>;
	responseExample?: Record<string, unknown>;
	requiresAuth: boolean;
}

export interface APITag {
	name: string;
	description: string;
	color: string;
}

/**
 * API Tags for categorization
 */
export const apiTags: APITag[] = [
	{ name: 'Courses', description: 'Course management endpoints', color: '#3b82f6' },
	{ name: 'Wallets', description: 'Wallet and credit management', color: '#06b6d4' },
	{ name: 'LLM', description: 'LLM and AI operations', color: '#f59e0b' },
	{ name: 'Voice', description: 'Voice synthesis and transcription', color: '#ec4899' }
];

/**
 * Complete API Specification
 * Focuses on Backend API Endpoints (Delegated Access)
 */
export const apiEndpoints: APIEndpoint[] = [
	// ============ Courses ============
	{
		method: 'POST',
		path: '/api/courses',
		summary: 'Create a new course',
		description: 'Creates a new course with server-side code uniqueness check',
		tags: ['Courses'],
		requiresAuth: true,
		bodyParams: [
			{ name: 'title', type: 'string', required: true, description: 'Course title' },
			{
				name: 'code',
				type: 'string',
				required: false,
				description: 'Unique course code (auto-generated if not provided)'
			},
			{
				name: 'visibility',
				type: 'string',
				required: false,
				description: 'Course visibility',
				enum: ['public', 'unlisted', 'private'],
				default: 'private'
			},
			{ name: 'theme', type: 'string', required: false, description: 'Course theme/category' },
			{ name: 'description', type: 'string', required: false, description: 'Course description' }
		],
		bodyExample: {
			title: 'Critical Thinking 101',
			code: 'CT101-2026',
			visibility: 'public',
			description: 'Learn Socratic dialogue techniques'
		}
	},
	{
		method: 'POST',
		path: '/api/courses/join',
		summary: 'Join course by code',
		description: 'Join a course using its unique code',
		tags: ['Courses'],
		requiresAuth: true,
		bodyParams: [
			{ name: 'code', type: 'string', required: true, description: 'Course code to join' }
		],
		bodyExample: {
			code: 'BIO101'
		},
		responseExample: {
			courseId: 'course_123',
			joined: true
		}
	},

	// ============ Wallets ============
	{
		method: 'GET',
		path: '/api/courses/:id/wallet',
		summary: 'Get course wallet',
		description: 'Get the host wallet for a course (course owner only)',
		tags: ['Wallets'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Course ID' }],
		queryParams: [
			{
				name: 'includeLedger',
				type: 'boolean',
				required: false,
				description: 'Include ledger entries'
			},
			{ name: 'ledgerLimit', type: 'number', required: false, description: 'Max ledger entries' }
		]
	},
	{
		method: 'POST',
		path: '/api/wallets',
		summary: 'Add credits',
		description: 'Add credits to user wallet',
		tags: ['Wallets'],
		requiresAuth: true,
		bodyParams: [
			{ name: 'amount', type: 'number', required: true, description: 'Amount to add' },
			{
				name: 'currency',
				type: 'string',
				required: false,
				description: 'Currency code',
				default: 'usd'
			}
		],
		bodyExample: {
			amount: 100,
			currency: 'usd'
		},
		responseExample: {
			message: 'Credits added successfully',
			newBalance: 150
		}
	},

	// ============ LLM ============
	{
		method: 'POST',
		path: '/api/llm',
		summary: 'LLM Message',
		description: 'Send message to LLM and get response (Action: message)',
		tags: ['LLM'],
		requiresAuth: true,
		bodyParams: [
			{
				name: 'action',
				type: 'string',
				required: true,
				description: "Must be 'message'",
				enum: ['message']
			},
			{ name: 'conversationId', type: 'string', required: true, description: 'Conversation ID' },
			{ name: 'text', type: 'string', required: true, description: 'User message text' }
		],
		bodyExample: {
			action: 'message',
			conversationId: 'conv_123',
			text: 'Hello, I have an idea.'
		}
	},
	{
		method: 'POST',
		path: '/api/llm',
		summary: 'LLM Analyze',
		description: 'Analyze conversation (Action: analyze)',
		tags: ['LLM'],
		requiresAuth: true,
		bodyParams: [
			{
				name: 'action',
				type: 'string',
				required: true,
				description: "Must be 'analyze'",
				enum: ['analyze']
			},
			{ name: 'conversationId', type: 'string', required: true, description: 'Conversation ID' }
		],
		bodyExample: {
			action: 'analyze',
			conversationId: 'conv_123'
		}
	},
	{
		method: 'POST',
		path: '/api/llm',
		summary: 'LLM Summary',
		description: 'Generate conversation summary (Action: summary)',
		tags: ['LLM'],
		requiresAuth: true,
		bodyParams: [
			{
				name: 'action',
				type: 'string',
				required: true,
				description: "Must be 'summary'",
				enum: ['summary']
			},
			{ name: 'conversationId', type: 'string', required: true, description: 'Conversation ID' }
		],
		bodyExample: {
			action: 'summary',
			conversationId: 'conv_123'
		}
	},
	{
		method: 'POST',
		path: '/api/llm/stream',
		summary: 'LLM Stream (SSE)',
		description: 'Streaming response via SSE',
		tags: ['LLM'],
		requiresAuth: true,
		bodyParams: [
			{ name: 'conversationId', type: 'string', required: true, description: 'Conversation ID' },
			{ name: 'text', type: 'string', required: true, description: 'User message text' }
		],
		bodyExample: {
			conversationId: 'conv_123',
			text: 'Stream this response'
		}
	},

	// ============ Voice ============
	{
		method: 'POST',
		path: '/api/voice',
		summary: 'Synthesize Speech',
		description: 'Convert text to speech (Action: synthesize)',
		tags: ['Voice'],
		requiresAuth: true,
		bodyParams: [
			{
				name: 'action',
				type: 'string',
				required: true,
				description: "Must be 'synthesize'",
				enum: ['synthesize']
			},
			{ name: 'text', type: 'string', required: true, description: 'Text to speak' },
			{ name: 'voiceId', type: 'string', required: false, description: 'Voice ID' }
		],
		bodyExample: {
			action: 'synthesize',
			text: 'Hello, welcome to Mentora.'
		}
	}
];

/**
 * Get endpoints grouped by tag
 */
export function getEndpointsByTag(): Map<string, APIEndpoint[]> {
	const grouped = new Map<string, APIEndpoint[]>();

	for (const tag of apiTags) {
		grouped.set(tag.name, []);
	}

	for (const endpoint of apiEndpoints) {
		for (const tag of endpoint.tags) {
			const list = grouped.get(tag) || [];
			list.push(endpoint);
			grouped.set(tag, list);
		}
	}

	return grouped;
}

/**
 * Get method color for UI
 */
export function getMethodColor(method: HttpMethod): string {
	const colors: Record<HttpMethod, string> = {
		GET: '#22c55e',
		POST: '#3b82f6',
		PATCH: '#f59e0b',
		PUT: '#8b5cf6',
		DELETE: '#ef4444'
	};
	return colors[method];
}
