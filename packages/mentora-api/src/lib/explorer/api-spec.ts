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
	{ name: 'Courses', description: 'Course management', color: '#3b82f6' },
	{ name: 'Topics', description: 'Topic management within courses', color: '#8b5cf6' },
	{ name: 'Assignments', description: 'Assignment CRUD and AI preview', color: '#10b981' },
	{ name: 'Conversations', description: 'Socratic dialogue conversations', color: '#f59e0b' },
	{ name: 'Submissions', description: 'Student submissions and grading', color: '#ef4444' },
	{ name: 'Wallets', description: 'Credits and wallet management', color: '#06b6d4' },
	{ name: 'Users', description: 'User profile management', color: '#ec4899' }
];

/**
 * Complete API Specification
 */
export const apiEndpoints: APIEndpoint[] = [
	// ============ Courses ============
	{
		method: 'POST',
		path: '/api/courses',
		summary: 'Create a new course',
		description: 'Creates a new course and adds the creator as instructor',
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
			{ name: 'description', type: 'string', required: false, description: 'Course description' },
			{
				name: 'isDemo',
				type: 'boolean',
				required: false,
				description: 'Whether this is a demo course',
				default: false
			}
		],
		bodyExample: {
			title: 'Critical Thinking 101',
			code: 'CT101-2026',
			visibility: 'public',
			description: 'Learn Socratic dialogue techniques'
		},
		responseExample: {
			id: 'course_abc123',
			title: 'Critical Thinking 101',
			code: 'CT101-2026',
			ownerId: 'user_xyz',
			visibility: 'public'
		}
	},
	{
		method: 'GET',
		path: '/api/courses',
		summary: 'List courses',
		description: 'List courses the authenticated user is a member of',
		tags: ['Courses'],
		requiresAuth: true,
		queryParams: [
			{
				name: 'visibility',
				type: 'string',
				required: false,
				description: 'Filter by visibility',
				enum: ['public', 'unlisted', 'private']
			},
			{
				name: 'role',
				type: 'string',
				required: false,
				description: "Filter by user's role",
				enum: ['instructor', 'ta', 'student', 'auditor']
			},
			{
				name: 'limit',
				type: 'number',
				required: false,
				description: 'Maximum results',
				default: 50
			}
		],
		responseExample: {
			courses: [{ id: 'course_abc123', title: 'Critical Thinking 101', code: 'CT101' }]
		}
	},
	{
		method: 'GET',
		path: '/api/courses/:id',
		summary: 'Get course details',
		tags: ['Courses'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Course ID' }]
	},
	{
		method: 'PATCH',
		path: '/api/courses/:id',
		summary: 'Update course',
		tags: ['Courses'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Course ID' }],
		bodyParams: [
			{ name: 'title', type: 'string', required: false, description: 'New title' },
			{ name: 'description', type: 'string', required: false, description: 'New description' },
			{
				name: 'visibility',
				type: 'string',
				required: false,
				description: 'New visibility',
				enum: ['public', 'unlisted', 'private']
			}
		]
	},
	{
		method: 'DELETE',
		path: '/api/courses/:id',
		summary: 'Delete course',
		tags: ['Courses'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Course ID' }]
	},
	{
		method: 'GET',
		path: '/api/courses/:id/roster',
		summary: 'Get course roster',
		tags: ['Courses'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Course ID' }],
		queryParams: [
			{
				name: 'status',
				type: 'string',
				required: false,
				description: 'Filter by status',
				enum: ['active', 'invited', 'all'],
				default: 'active'
			}
		]
	},
	{
		method: 'POST',
		path: '/api/courses/:id/roster',
		summary: 'Invite member to course',
		tags: ['Courses'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Course ID' }],
		bodyParams: [
			{ name: 'email', type: 'string', required: true, description: 'Email to invite' },
			{
				name: 'role',
				type: 'string',
				required: false,
				description: 'Role to assign',
				enum: ['instructor', 'student'],
				default: 'student'
			}
		]
	},
	{
		method: 'PATCH',
		path: '/api/courses/:id/roster/:memberId',
		summary: 'Update member role',
		tags: ['Courses'],
		requiresAuth: true,
		pathParams: [
			{ name: 'id', type: 'string', required: true, description: 'Course ID' },
			{ name: 'memberId', type: 'string', required: true, description: 'Member ID' }
		],
		bodyParams: [
			{
				name: 'role',
				type: 'string',
				required: true,
				description: 'New role',
				enum: ['instructor', 'ta', 'student', 'auditor']
			}
		]
	},
	{
		method: 'DELETE',
		path: '/api/courses/:id/roster/:memberId',
		summary: 'Remove member from course',
		tags: ['Courses'],
		requiresAuth: true,
		pathParams: [
			{ name: 'id', type: 'string', required: true, description: 'Course ID' },
			{ name: 'memberId', type: 'string', required: true, description: 'Member ID' }
		]
	},

	// ============ Topics ============
	{
		method: 'POST',
		path: '/api/courses/:id/topics',
		summary: 'Create topic',
		tags: ['Topics'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Course ID' }],
		bodyParams: [
			{ name: 'title', type: 'string', required: true, description: 'Topic title' },
			{ name: 'description', type: 'string', required: false, description: 'Topic description' },
			{ name: 'order', type: 'number', required: false, description: 'Display order' }
		]
	},
	{
		method: 'GET',
		path: '/api/courses/:id/topics',
		summary: 'List course topics',
		tags: ['Topics'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Course ID' }]
	},
	{
		method: 'GET',
		path: '/api/topics/:id',
		summary: 'Get topic details',
		tags: ['Topics'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Topic ID' }]
	},
	{
		method: 'PATCH',
		path: '/api/topics/:id',
		summary: 'Update topic',
		tags: ['Topics'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Topic ID' }],
		bodyParams: [
			{ name: 'title', type: 'string', required: false, description: 'New title' },
			{ name: 'description', type: 'string', required: false, description: 'New description' },
			{ name: 'order', type: 'number', required: false, description: 'New order' }
		]
	},
	{
		method: 'DELETE',
		path: '/api/topics/:id',
		summary: 'Delete topic',
		tags: ['Topics'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Topic ID' }]
	},

	// ============ Assignments ============
	{
		method: 'POST',
		path: '/api/assignments',
		summary: 'Create assignment',
		tags: ['Assignments'],
		requiresAuth: true,
		bodyParams: [
			{ name: 'courseId', type: 'string', required: true, description: 'Course ID' },
			{ name: 'topicId', type: 'string', required: false, description: 'Topic ID' },
			{ name: 'title', type: 'string', required: true, description: 'Assignment title' },
			{ name: 'prompt', type: 'string', required: true, description: 'Socratic dialogue prompt' },
			{ name: 'startAt', type: 'number', required: false, description: 'Start timestamp (ms)' },
			{ name: 'dueAt', type: 'number', required: false, description: 'Due timestamp (ms)' },
			{ name: 'aiConfig', type: 'object', required: false, description: 'AI configuration' }
		],
		bodyExample: {
			courseId: 'course_abc123',
			title: 'Is Technology Making Us Less Human?',
			prompt:
				'Consider the role of AI in education and argue whether it enhances or diminishes the human learning experience.',
			aiConfig: {
				dialecticalConfig: {
					enabledStrategies: ['clarify', 'challenge', 'devils_advocate']
				}
			}
		}
	},
	{
		method: 'GET',
		path: '/api/assignments',
		summary: 'List assignments',
		tags: ['Assignments'],
		requiresAuth: true,
		queryParams: [
			{ name: 'courseId', type: 'string', required: false, description: 'Filter by course' },
			{ name: 'topicId', type: 'string', required: false, description: 'Filter by topic' },
			{
				name: 'status',
				type: 'string',
				required: false,
				description: 'Filter by status',
				enum: ['active', 'upcoming', 'past']
			},
			{
				name: 'limit',
				type: 'number',
				required: false,
				description: 'Maximum results',
				default: 50
			}
		]
	},
	{
		method: 'GET',
		path: '/api/assignments/:id',
		summary: 'Get assignment details',
		tags: ['Assignments'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Assignment ID' }]
	},
	{
		method: 'PATCH',
		path: '/api/assignments/:id',
		summary: 'Update assignment',
		tags: ['Assignments'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Assignment ID' }],
		bodyParams: [
			{ name: 'title', type: 'string', required: false, description: 'New title' },
			{ name: 'prompt', type: 'string', required: false, description: 'New prompt' },
			{ name: 'dueAt', type: 'number', required: false, description: 'New due date' }
		]
	},
	{
		method: 'DELETE',
		path: '/api/assignments/:id',
		summary: 'Delete assignment',
		tags: ['Assignments'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Assignment ID' }]
	},
	{
		method: 'POST',
		path: '/api/assignments/:id/preview',
		summary: 'Preview AI response',
		description: 'Test the AI response without creating a conversation',
		tags: ['Assignments'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Assignment ID' }],
		bodyParams: [
			{
				name: 'studentMessage',
				type: 'string',
				required: true,
				description: 'Sample student message'
			},
			{
				name: 'strategy',
				type: 'string',
				required: false,
				description: 'Dialectical strategy to use',
				enum: ['clarify', 'challenge', 'devils_advocate', 'summarize']
			}
		],
		bodyExample: {
			studentMessage: 'I believe technology makes us more connected but less present.',
			strategy: 'challenge'
		}
	},
	{
		method: 'GET',
		path: '/api/assignments/:id/statistics',
		summary: 'Get assignment statistics',
		tags: ['Assignments'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Assignment ID' }]
	},
	{
		method: 'GET',
		path: '/api/assignments/:id/statistics/export',
		summary: 'Export statistics as CSV',
		tags: ['Assignments'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Assignment ID' }]
	},

	// ============ Submissions ============
	{
		method: 'GET',
		path: '/api/assignments/:id/submissions',
		summary: 'List submissions for assignment',
		tags: ['Submissions'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Assignment ID' }],
		queryParams: [
			{
				name: 'status',
				type: 'string',
				required: false,
				description: 'Filter by status',
				enum: ['in_progress', 'completed', 'graded']
			},
			{
				name: 'limit',
				type: 'number',
				required: false,
				description: 'Maximum results',
				default: 50
			}
		]
	},
	{
		method: 'GET',
		path: '/api/assignments/:id/submissions/:submissionId',
		summary: 'Get submission details',
		tags: ['Submissions'],
		requiresAuth: true,
		pathParams: [
			{ name: 'id', type: 'string', required: true, description: 'Assignment ID' },
			{ name: 'submissionId', type: 'string', required: true, description: 'Submission ID' }
		]
	},
	{
		method: 'PATCH',
		path: '/api/assignments/:id/submissions/:submissionId',
		summary: 'Grade submission',
		tags: ['Submissions'],
		requiresAuth: true,
		pathParams: [
			{ name: 'id', type: 'string', required: true, description: 'Assignment ID' },
			{ name: 'submissionId', type: 'string', required: true, description: 'Submission ID' }
		],
		bodyParams: [
			{ name: 'grade', type: 'number', required: false, description: 'Numeric grade (0-100)' },
			{ name: 'feedback', type: 'string', required: false, description: 'Instructor feedback' },
			{
				name: 'status',
				type: 'string',
				required: false,
				description: 'Submission status',
				enum: ['graded']
			}
		],
		bodyExample: {
			grade: 85,
			feedback:
				'Good critical thinking demonstrated. Consider exploring counter-arguments more deeply.',
			status: 'graded'
		}
	},

	// ============ Conversations ============
	{
		method: 'POST',
		path: '/api/conversations',
		summary: 'Create conversation',
		description: 'Start a new Socratic dialogue conversation',
		tags: ['Conversations'],
		requiresAuth: true,
		bodyParams: [
			{ name: 'assignmentId', type: 'string', required: true, description: 'Assignment ID' }
		]
	},
	{
		method: 'GET',
		path: '/api/conversations',
		summary: 'List conversations',
		tags: ['Conversations'],
		requiresAuth: true,
		queryParams: [
			{
				name: 'assignmentId',
				type: 'string',
				required: false,
				description: 'Filter by assignment'
			},
			{
				name: 'state',
				type: 'string',
				required: false,
				description: 'Filter by state',
				enum: ['awaiting_idea', 'awaiting_followup', 'closed']
			},
			{
				name: 'limit',
				type: 'number',
				required: false,
				description: 'Maximum results',
				default: 20
			}
		]
	},
	{
		method: 'GET',
		path: '/api/conversations/:id',
		summary: 'Get conversation details',
		tags: ['Conversations'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Conversation ID' }]
	},
	{
		method: 'POST',
		path: '/api/conversations/:id/turns',
		summary: 'Add turn to conversation',
		description: 'Add a student message and receive AI response',
		tags: ['Conversations'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Conversation ID' }],
		bodyParams: [
			{ name: 'text', type: 'string', required: true, description: "Student's message" },
			{
				name: 'type',
				type: 'string',
				required: false,
				description: 'Turn type',
				enum: ['idea', 'followup'],
				default: 'followup'
			}
		],
		bodyExample: {
			text: 'I think AI can enhance learning by providing personalized feedback, but it might reduce human connection.',
			type: 'idea'
		}
	},
	{
		method: 'POST',
		path: '/api/conversations/:id/stream',
		summary: 'Stream AI response (SSE)',
		description: 'Get streaming AI response via Server-Sent Events',
		tags: ['Conversations'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Conversation ID' }],
		bodyParams: [{ name: 'text', type: 'string', required: true, description: "Student's message" }]
	},
	{
		method: 'POST',
		path: '/api/conversations/:id/end',
		summary: 'End conversation',
		tags: ['Conversations'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Conversation ID' }]
	},
	{
		method: 'GET',
		path: '/api/conversations/:id/summary',
		summary: 'Get AI-generated summary',
		description: 'Generate a summary of the conversation with stance analysis',
		tags: ['Conversations'],
		requiresAuth: true,
		pathParams: [{ name: 'id', type: 'string', required: true, description: 'Conversation ID' }]
	},

	// ============ Wallets ============
	{
		method: 'GET',
		path: '/api/wallets/me',
		summary: 'Get my wallet',
		tags: ['Wallets'],
		requiresAuth: true,
		queryParams: [
			{
				name: 'includeLedger',
				type: 'boolean',
				required: false,
				description: 'Include ledger entries',
				default: false
			},
			{
				name: 'ledgerLimit',
				type: 'number',
				required: false,
				description: 'Max ledger entries',
				default: 20
			}
		]
	},
	{
		method: 'POST',
		path: '/api/wallets/me/credits',
		summary: 'Add credits to wallet',
		tags: ['Wallets'],
		requiresAuth: true,
		bodyParams: [
			{ name: 'amount', type: 'number', required: true, description: 'Amount to add' },
			{
				name: 'paymentMethodId',
				type: 'string',
				required: false,
				description: 'Payment method ID'
			},
			{ name: 'idempotencyKey', type: 'string', required: false, description: 'Idempotency key' }
		],
		bodyExample: {
			amount: 10.0,
			idempotencyKey: 'payment_abc123'
		}
	},
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
