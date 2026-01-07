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
	{ name: 'Conversations', description: 'Conversation lifecycle management', color: '#8b5cf6' },
	{ name: 'Assignments', description: 'Assignment operations', color: '#10b981' },
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
		path: '/api/courses/join',
		summary: 'Join course by code',
		description: 'Join a course using its unique code with optional password',
		tags: ['Courses'],
		requiresAuth: true,
		bodyParams: [
			{ name: 'code', type: 'string', required: true, description: 'Course code to join' },
			{
				name: 'password',
				type: 'string',
				required: false,
				description: 'Course password if required'
			}
		],
		bodyExample: {
			code: 'CT101-2026',
			password: 'optional-password'
		},
		responseExample: {
			courseId: 'course_123',
			joined: true,
			alreadyMember: false
		}
	},

	// ============ Conversations ============
	{
		method: 'POST',
		path: '/api/conversations',
		summary: 'Create conversation',
		description: 'Create a new conversation for an assignment (or return existing)',
		tags: ['Conversations'],
		requiresAuth: true,
		bodyParams: [
			{ name: 'assignmentId', type: 'string', required: true, description: 'Assignment ID' }
		],
		bodyExample: {
			assignmentId: 'assignment_123'
		},
		responseExample: {
			id: 'conv_456',
			state: 'awaiting_idea',
			isExisting: false
		}
	},
	{
		method: 'POST',
		path: '/api/conversations/:id/end',
		summary: 'End conversation',
		description: 'End a conversation and finalize submission',
		tags: ['Conversations'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Conversation ID' }],
		responseExample: {
			state: 'closed',
			conversation: {},
			alreadyClosed: false
		}
	},
	{
		method: 'POST',
		path: '/api/conversations/:id/message',
		summary: 'Submit message',
		description: 'Submit a user message and trigger AI response',
		tags: ['Conversations', 'LLM'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Conversation ID' }],
		bodyParams: [
			{ name: 'text', type: 'string', required: true, description: 'User message text' }
		],
		bodyExample: {
			text: 'I believe critical thinking is essential for democracy.'
		}
	},

	// ============ Assignments ============
	{
		method: 'POST',
		path: '/api/assignments/:id/preview',
		summary: 'Preview assignment AI',
		description: 'Test LLM response for an assignment (instructors only)',
		tags: ['Assignments', 'LLM'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Assignment ID' }],
		bodyParams: [
			{
				name: 'testMessage',
				type: 'string',
				required: true,
				description: 'Test message to send to AI'
			}
		],
		bodyExample: {
			testMessage: 'Social media is harmful to society.'
		},
		responseExample: {
			response: 'Interesting point. What evidence supports this view?',
			strategy: 'clarify',
			estimatedTokens: 150,
			estimatedCost: 0.0023,
			inputTokens: 50,
			outputTokens: 100
		}
	},

	// ============ Wallets ============
	{
		method: 'GET',
		path: '/api/courses/:id/wallet',
		summary: 'Get course wallet stats',
		description: 'Get the host wallet statistics for a course (course owner only)',
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
			{
				name: 'ledgerLimit',
				type: 'number',
				required: false,
				description: 'Max ledger entries',
				default: 20
			}
		],
		responseExample: {
			wallet: {
				id: 'wallet_host_course_123',
				ownerType: 'host',
				ownerId: 'course_123',
				balanceCredits: 500
			},
			ledger: [],
			stats: {
				totalCharges: 1250,
				transactionCount: 42
			}
		}
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

	// ============ Voice ============
	{
		method: 'POST',
		path: '/api/voice/transcribe',
		summary: 'Transcribe audio',
		description: 'Convert audio to text (multipart/form-data)',
		tags: ['Voice'],
		requiresAuth: true,
		bodyParams: [
			{ name: 'audio', type: 'object', required: true, description: 'Audio file (File/Blob)' }
		],
		responseExample: {
			text: 'I believe the main argument here is...',
			confidence: 0.92,
			duration: 4.2
		}
	},
	{
		method: 'POST',
		path: '/api/voice/synthesize',
		summary: 'Synthesize speech',
		description: 'Convert text to speech (JSON)',
		tags: ['Voice'],
		requiresAuth: true,
		bodyParams: [
			{ name: 'text', type: 'string', required: true, description: 'Text to speak' },
			{ name: 'voiceId', type: 'string', required: false, description: 'Voice ID' }
		],
		bodyExample: {
			text: 'Hello, welcome to Mentora.',
			voiceId: 'en-US-Neural2-A'
		},
		responseExample: {
			audioContent: 'base64-encoded-audio-data',
			contentType: 'audio/mp3'
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
