/**
 * Mentora API Specification
 *
 * Documents all SDK methods available in MentoraClient.
 * Includes both Direct Access (Firestore) and Delegated Access (Backend) methods.
 */

export type AccessType = 'direct' | 'delegated';

export interface APIParameter {
	name: string;
	type: string;
	required: boolean;
	description: string;
	default?: unknown;
}

export interface APIMethod {
	name: string;
	signature: string;
	summary: string;
	description?: string;
	accessType: AccessType;
	requiresAuth: boolean;
	params: APIParameter[];
	returns: string;
	example?: {
		call: string;
		response: unknown;
	};
}

export interface APIModule {
	name: string;
	description: string;
	color: string;
	icon: string;
	methods: APIMethod[];
}

/**
 * Complete API Specification for MentoraClient
 */
export const apiModules: APIModule[] = [
	// ============ Users ============
	{
		name: 'users',
		description: 'User profile management',
		color: '#8b5cf6',
		icon: '👤',
		methods: [
			{
				name: 'getMyProfile',
				signature: 'users.getMyProfile()',
				summary: 'Get current user profile',
				description: 'Retrieves the profile of the currently authenticated user',
				accessType: 'direct',
				requiresAuth: true,
				params: [],
				returns: 'Promise<APIResult<UserProfile>>',
				example: {
					call: 'await client.users.getMyProfile()',
					response: {
						uid: 'user_123',
						displayName: 'John Doe',
						email: 'john@example.com',
						photoURL: 'https://...',
						role: 'student'
					}
				}
			},
			{
				name: 'getProfile',
				signature: 'users.getProfile(uid)',
				summary: 'Get user profile by UID',
				description: 'Retrieves the profile of a specific user',
				accessType: 'direct',
				requiresAuth: true,
				params: [{ name: 'uid', type: 'string', required: true, description: 'User UID' }],
				returns: 'Promise<APIResult<UserProfile>>'
			},
			{
				name: 'updateMyProfile',
				signature: 'users.updateMyProfile(profile)',
				summary: 'Update current user profile',
				description: 'Updates the profile of the currently authenticated user',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{
						name: 'profile',
						type: 'Partial<UserProfile>',
						required: true,
						description: 'Profile fields to update'
					}
				],
				returns: 'Promise<APIResult<void>>',
				example: {
					call: 'await client.users.updateMyProfile({ displayName: "New Name" })',
					response: { success: true }
				}
			}
		]
	},

	// ============ Courses ============
	{
		name: 'courses',
		description: 'Course management and enrollment',
		color: '#3b82f6',
		icon: '📚',
		methods: [
			{
				name: 'get',
				signature: 'courses.get(courseId)',
				summary: 'Get course by ID',
				accessType: 'direct',
				requiresAuth: true,
				params: [{ name: 'courseId', type: 'string', required: true, description: 'Course ID' }],
				returns: 'Promise<APIResult<CourseDoc>>'
			},
			{
				name: 'listMine',
				signature: 'courses.listMine(options?)',
				summary: 'List courses I own',
				description: 'Returns courses where the current user is the owner',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{
						name: 'options',
						type: 'QueryOptions',
						required: false,
						description: 'Query options (limit, orderBy, where)'
					}
				],
				returns: 'Promise<APIResult<CourseDoc[]>>'
			},
			{
				name: 'listEnrolled',
				signature: 'courses.listEnrolled(options?)',
				summary: 'List enrolled courses',
				description: 'Returns courses where the current user is a member',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'options', type: 'QueryOptions', required: false, description: 'Query options' }
				],
				returns: 'Promise<APIResult<CourseDoc[]>>'
			},
			{
				name: 'listAllEnrolled',
				signature: 'courses.listAllEnrolled(options?)',
				summary: 'List all enrolled courses (owned + member)',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'options', type: 'QueryOptions', required: false, description: 'Query options' }
				],
				returns: 'Promise<APIResult<CourseDoc[]>>'
			},
			{
				name: 'listPublic',
				signature: 'courses.listPublic(options?)',
				summary: 'List public courses',
				description: 'Returns courses with public visibility',
				accessType: 'direct',
				requiresAuth: false,
				params: [
					{ name: 'options', type: 'QueryOptions', required: false, description: 'Query options' }
				],
				returns: 'Promise<APIResult<CourseDoc[]>>'
			},
			{
				name: 'create',
				signature: 'courses.create(title, code?, options?)',
				summary: 'Create a new course',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'title', type: 'string', required: true, description: 'Course title' },
					{
						name: 'code',
						type: 'string',
						required: false,
						description: 'Course code (auto-generated if not provided)'
					},
					{
						name: 'options',
						type: 'CreateCourseOptions',
						required: false,
						description: 'Additional options (description, visibility, etc.)'
					}
				],
				returns: 'Promise<APIResult<string>>',
				example: {
					call: 'await client.courses.create("Critical Thinking 101", "CT101")',
					response: 'course_abc123'
				}
			},
			{
				name: 'copy',
				signature: 'courses.copy(courseId, options)',
				summary: 'Copy a course',
				description: 'Creates a deep copy of the course including topics and assignments',
				accessType: 'delegated',
				requiresAuth: true,
				params: [
					{ name: 'courseId', type: 'string', required: true, description: 'Source Course ID' },
					{
						name: 'options',
						type: '{ title?, includeContent?, includeRoster?, isDemo? }',
						required: true,
						description: 'Copy options'
					}
				],
				returns: 'Promise<APIResult<string>>',
				example: {
					call: 'await client.courses.copy("src_123", { title: "Copy of ...", includeContent: true })',
					response: 'new_course_456'
				}
			},
			{
				name: 'createAnnouncement',
				signature: 'courses.createAnnouncement(courseId, content)',
				summary: 'Post an announcement',
				accessType: 'delegated',
				requiresAuth: true,
				params: [
					{ name: 'courseId', type: 'string', required: true, description: 'Course ID' },
					{ name: 'content', type: 'string', required: true, description: 'Announcement content' }
				],
				returns: 'Promise<APIResult<CourseAnnouncement>>'
			},
			{
				name: 'update',
				signature: 'courses.update(courseId, updates)',
				summary: 'Update course details',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'courseId', type: 'string', required: true, description: 'Course ID' },
					{
						name: 'updates',
						type: 'Partial<CourseDoc>',
						required: true,
						description: 'Fields to update'
					}
				],
				returns: 'Promise<APIResult<CourseDoc>>'
			},
			{
				name: 'delete',
				signature: 'courses.delete(courseId)',
				summary: 'Delete a course',
				accessType: 'direct',
				requiresAuth: true,
				params: [{ name: 'courseId', type: 'string', required: true, description: 'Course ID' }],
				returns: 'Promise<APIResult<void>>'
			},
			{
				name: 'getRoster',
				signature: 'courses.getRoster(courseId, options?)',
				summary: 'Get course roster (members)',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'courseId', type: 'string', required: true, description: 'Course ID' },
					{ name: 'options', type: 'QueryOptions', required: false, description: 'Query options' }
				],
				returns: 'Promise<APIResult<CourseMembership[]>>'
			},
			{
				name: 'inviteMember',
				signature: 'courses.inviteMember(courseId, email, role?)',
				summary: 'Invite member to course',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'courseId', type: 'string', required: true, description: 'Course ID' },
					{ name: 'email', type: 'string', required: true, description: 'Email to invite' },
					{
						name: 'role',
						type: "'instructor' | 'student' | 'ta' | 'auditor'",
						required: false,
						description: 'Member role',
						default: 'student'
					}
				],
				returns: 'Promise<APIResult<string>>'
			},
			{
				name: 'joinByCode',
				signature: 'courses.joinByCode(code)',
				summary: 'Join course by code',
				description: 'Join a course using its unique code',
				accessType: 'delegated',
				requiresAuth: true,
				params: [{ name: 'code', type: 'string', required: true, description: 'Course join code' }],
				returns: 'Promise<APIResult<JoinCourseResult>>',
				example: {
					call: 'await client.courses.joinByCode("CT101-2026")',
					response: { courseId: 'course_123', joined: true, alreadyMember: false }
				}
			},
			{
				name: 'updateMember',
				signature: 'courses.updateMember(courseId, memberId, updates)',
				summary: 'Update member role/status',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'courseId', type: 'string', required: true, description: 'Course ID' },
					{ name: 'memberId', type: 'string', required: true, description: 'Member UID' },
					{
						name: 'updates',
						type: '{ role?, status? }',
						required: true,
						description: 'Fields to update'
					}
				],
				returns: 'Promise<APIResult<CourseMembership>>'
			},
			{
				name: 'removeMember',
				signature: 'courses.removeMember(courseId, memberId)',
				summary: 'Remove member from course',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'courseId', type: 'string', required: true, description: 'Course ID' },
					{ name: 'memberId', type: 'string', required: true, description: 'Member UID' }
				],
				returns: 'Promise<APIResult<void>>'
			},
			{
				name: 'getWallet',
				signature: 'courses.getWallet(courseId, options?)',
				summary: 'Get course wallet',
				accessType: 'delegated',
				requiresAuth: true,
				params: [
					{ name: 'courseId', type: 'string', required: true, description: 'Course ID' },
					{
						name: 'options',
						type: '{ includeLedger?, ledgerLimit? }',
						required: false,
						description: 'Options'
					}
				],
				returns: 'Promise<APIResult<CourseWalletResult>>'
			},
			{
				name: 'getWalletStats',
				signature: 'courses.getWalletStats(courseId, options?)',
				summary: 'Get course wallet statistics',
				accessType: 'delegated',
				requiresAuth: true,
				params: [
					{ name: 'courseId', type: 'string', required: true, description: 'Course ID' },
					{
						name: 'options',
						type: '{ includeLedger?, ledgerLimit? }',
						required: false,
						description: 'Options'
					}
				],
				returns: 'Promise<APIResult<CourseWalletStatsResult>>'
			}
		]
	},
	{
		name: 'announcements',
		description: 'Persistent announcement inbox',
		color: '#f59e0b',
		icon: '📣',
		methods: [
			{
				name: 'get',
				signature: 'announcements.get(announcementId)',
				summary: 'Get my announcement by ID',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{
						name: 'announcementId',
						type: 'string',
						required: true,
						description: 'Announcement ID'
					}
				],
				returns: 'Promise<APIResult<AnnouncementDoc>>'
			},
			{
				name: 'listMine',
				signature: 'announcements.listMine(options?)',
				summary: 'List my announcements',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{
						name: 'options',
						type: 'QueryOptions',
						required: false,
						description: 'Query options'
					}
				],
				returns: 'Promise<APIResult<AnnouncementDoc[]>>'
			},
			{
				name: 'markRead',
				signature: 'announcements.markRead(announcementId)',
				summary: 'Mark one announcement as read',
				accessType: 'delegated',
				requiresAuth: true,
				params: [
					{
						name: 'announcementId',
						type: 'string',
						required: true,
						description: 'Announcement ID'
					}
				],
				returns: 'Promise<APIResult<{ updated: boolean }>>'
			},
			{
				name: 'markAllRead',
				signature: 'announcements.markAllRead()',
				summary: 'Mark all announcements as read',
				accessType: 'delegated',
				requiresAuth: true,
				params: [],
				returns: 'Promise<APIResult<{ updatedCount: number }>>'
			}
		]
	},

	// ============ Topics ============
	{
		name: 'topics',
		description: 'Topic management within courses',
		color: '#10b981',
		icon: '📝',
		methods: [
			{
				name: 'get',
				signature: 'topics.get(topicId)',
				summary: 'Get topic by ID',
				accessType: 'direct',
				requiresAuth: true,
				params: [{ name: 'topicId', type: 'string', required: true, description: 'Topic ID' }],
				returns: 'Promise<APIResult<Topic>>'
			},
			{
				name: 'listForCourse',
				signature: 'topics.listForCourse(courseId, options?)',
				summary: 'List topics in a course',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'courseId', type: 'string', required: true, description: 'Course ID' },
					{ name: 'options', type: 'QueryOptions', required: false, description: 'Query options' }
				],
				returns: 'Promise<APIResult<Topic[]>>'
			},
			{
				name: 'create',
				signature: 'topics.create(topic)',
				summary: 'Create a new topic',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{
						name: 'topic',
						type: 'Omit<Topic, "id" | "createdBy" | "createdAt" | "updatedAt">',
						required: true,
						description: 'Topic data'
					}
				],
				returns: 'Promise<APIResult<string>>',
				example: {
					call: 'await client.topics.create({ courseId: "...", title: "Climate Change", description: "..." })',
					response: 'topic_xyz789'
				}
			},
			{
				name: 'update',
				signature: 'topics.update(topicId, updates)',
				summary: 'Update topic',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'topicId', type: 'string', required: true, description: 'Topic ID' },
					{
						name: 'updates',
						type: 'Partial<Topic>',
						required: true,
						description: 'Fields to update'
					}
				],
				returns: 'Promise<APIResult<void>>'
			},
			{
				name: 'delete',
				signature: 'topics.delete(topicId)',
				summary: 'Delete topic',
				accessType: 'direct',
				requiresAuth: true,
				params: [{ name: 'topicId', type: 'string', required: true, description: 'Topic ID' }],
				returns: 'Promise<APIResult<void>>'
			}
		]
	},

	// ============ Assignments ============
	{
		name: 'assignments',
		description: 'Assignment management and AI preview',
		color: '#f59e0b',
		icon: '📋',
		methods: [
			{
				name: 'get',
				signature: 'assignments.get(assignmentId)',
				summary: 'Get assignment by ID',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'assignmentId', type: 'string', required: true, description: 'Assignment ID' }
				],
				returns: 'Promise<APIResult<Assignment>>'
			},
			{
				name: 'listForCourse',
				signature: 'assignments.listForCourse(courseId, options?)',
				summary: 'List all assignments in a course',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'courseId', type: 'string', required: true, description: 'Course ID' },
					{ name: 'options', type: 'QueryOptions', required: false, description: 'Query options' }
				],
				returns: 'Promise<APIResult<Assignment[]>>'
			},
			{
				name: 'listAvailable',
				signature: 'assignments.listAvailable(courseId, options?)',
				summary: 'List available assignments (started & not ended)',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'courseId', type: 'string', required: true, description: 'Course ID' },
					{ name: 'options', type: 'QueryOptions', required: false, description: 'Query options' }
				],
				returns: 'Promise<APIResult<Assignment[]>>'
			},
			{
				name: 'create',
				signature: 'assignments.create(assignment)',
				summary: 'Create a new assignment',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{
						name: 'assignment',
						type: 'Omit<Assignment, "id" | "createdBy" | "createdAt" | "updatedAt">',
						required: true,
						description: 'Assignment data'
					}
				],
				returns: 'Promise<APIResult<string>>'
			},
			{
				name: 'update',
				signature: 'assignments.update(assignmentId, updates)',
				summary: 'Update assignment',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'assignmentId', type: 'string', required: true, description: 'Assignment ID' },
					{
						name: 'updates',
						type: 'Partial<Assignment>',
						required: true,
						description: 'Fields to update'
					}
				],
				returns: 'Promise<APIResult<Assignment>>'
			},
			{
				name: 'delete',
				signature: 'assignments.delete(assignmentId)',
				summary: 'Delete assignment',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'assignmentId', type: 'string', required: true, description: 'Assignment ID' }
				],
				returns: 'Promise<APIResult<void>>'
			},
			{
				name: 'preview',
				signature: 'assignments.preview(assignmentId, testMessage)',
				summary: 'Preview AI response',
				description: 'Test LLM response for an assignment (instructors only)',
				accessType: 'delegated',
				requiresAuth: true,
				params: [
					{ name: 'assignmentId', type: 'string', required: true, description: 'Assignment ID' },
					{
						name: 'testMessage',
						type: 'string',
						required: true,
						description: 'Test message to send to AI'
					}
				],
				returns: 'Promise<APIResult<PreviewResult>>',
				example: {
					call: 'await client.assignments.preview("assignment_123", "Social media is harmful")',
					response: {
						response: 'Interesting point. What evidence supports this view?',
						strategy: 'clarify',
						estimatedTokens: 150
					}
				}
			}
		]
	},

	// ============ Submissions ============
	{
		name: 'submissions',
		description: 'Student submission management',
		color: '#06b6d4',
		icon: '✅',
		methods: [
			{
				name: 'get',
				signature: 'submissions.get(assignmentId, userId)',
				summary: 'Get submission by assignment and user',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'assignmentId', type: 'string', required: true, description: 'Assignment ID' },
					{ name: 'userId', type: 'string', required: true, description: 'User ID' }
				],
				returns: 'Promise<APIResult<Submission>>'
			},
			{
				name: 'getMine',
				signature: 'submissions.getMine(assignmentId)',
				summary: 'Get my submission for an assignment',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'assignmentId', type: 'string', required: true, description: 'Assignment ID' }
				],
				returns: 'Promise<APIResult<Submission>>'
			},
			{
				name: 'listForAssignment',
				signature: 'submissions.listForAssignment(assignmentId, options?)',
				summary: 'List all submissions for an assignment',
				description: 'For instructors to view all student submissions',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'assignmentId', type: 'string', required: true, description: 'Assignment ID' },
					{ name: 'options', type: 'QueryOptions', required: false, description: 'Query options' }
				],
				returns: 'Promise<APIResult<Submission[]>>'
			},
			{
				name: 'start',
				signature: 'submissions.start(assignmentId)',
				summary: 'Start a submission',
				description: 'Mark that the student has started working on an assignment',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'assignmentId', type: 'string', required: true, description: 'Assignment ID' }
				],
				returns: 'Promise<APIResult<void>>'
			},
			{
				name: 'submit',
				signature: 'submissions.submit(assignmentId)',
				summary: 'Submit assignment',
				description: 'Mark the assignment as submitted',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'assignmentId', type: 'string', required: true, description: 'Assignment ID' }
				],
				returns: 'Promise<APIResult<void>>'
			},
			{
				name: 'grade',
				signature: 'submissions.grade(assignmentId, userId, updates)',
				summary: 'Grade a submission',
				description: 'Update score and notes for a student submission',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'assignmentId', type: 'string', required: true, description: 'Assignment ID' },
					{ name: 'userId', type: 'string', required: true, description: 'Student user ID' },
					{
						name: 'updates',
						type: '{ scoreCompletion?, notes?, state? }',
						required: true,
						description: 'Grading updates'
					}
				],
				returns: 'Promise<APIResult<Submission>>'
			}
		]
	},

	// ============ Conversations ============
	{
		name: 'conversations',
		description: 'AI conversation management',
		color: '#8b5cf6',
		icon: '💬',
		methods: [
			{
				name: 'get',
				signature: 'conversations.get(conversationId)',
				summary: 'Get conversation by ID',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'conversationId', type: 'string', required: true, description: 'Conversation ID' }
				],
				returns: 'Promise<APIResult<Conversation>>'
			},
			{
				name: 'getForAssignment',
				signature: 'conversations.getForAssignment(assignmentId, userId?)',
				summary: 'Get conversation for an assignment',
				description:
					'Get the conversation for the current user (or specified user) for an assignment',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'assignmentId', type: 'string', required: true, description: 'Assignment ID' },
					{
						name: 'userId',
						type: 'string',
						required: false,
						description: 'User ID (defaults to current user)'
					}
				],
				returns: 'Promise<APIResult<Conversation>>'
			},
			{
				name: 'create',
				signature: 'conversations.create(assignmentId)',
				summary: 'Create conversation',
				description: 'Create a conversation for an assignment (new, existing, or reopened)',
				accessType: 'delegated',
				requiresAuth: true,
				params: [
					{ name: 'assignmentId', type: 'string', required: true, description: 'Assignment ID' }
				],
				returns: 'Promise<APIResult<{ id: string; created: boolean; reopened: boolean }>>',
				example: {
					call: 'await client.conversations.create("assignment_123")',
					response: { id: 'conv_456', created: true, reopened: false }
				}
			},
			{
				name: 'end',
				signature: 'conversations.end(conversationId)',
				summary: 'End conversation',
				description: 'End a conversation and finalize submission',
				accessType: 'delegated',
				requiresAuth: true,
				params: [
					{ name: 'conversationId', type: 'string', required: true, description: 'Conversation ID' }
				],
				returns: 'Promise<APIResult<{ state, conversation }>>'
			},
			{
				name: 'addTurn',
				signature:
					'conversations.addTurn(conversationId, string | { text } | { audioBase64, audioMimeType } | { audio, text? })',
				summary: 'Send message to AI',
				description:
					'Add a user message turn and trigger AI response processing. Accepts plain text, base64 audio, or multipart audio payload.',
				accessType: 'delegated',
				requiresAuth: true,
				params: [
					{
						name: 'conversationId',
						type: 'string',
						required: true,
						description: 'Conversation ID'
					},
					{
						name: 'input',
						type: 'string | { text: string } | { audioBase64: string; audioMimeType: string } | { audio: Blob; text?: string }',
						required: true,
						description: 'User message text or audio payload'
					}
				],
				returns: 'Promise<APIResult<{ text, audio, audioMimeType }>>',
				example: {
					call: 'await client.conversations.addTurn("conv_123", { text: "I believe..." })',
					response: {
						text: 'Can you explain your reasoning in more detail?',
						audio: '<base64>',
						audioMimeType: 'audio/mp3'
					}
				}
			}
		]
	},

	// ============ Wallets ============
	{
		name: 'wallets',
		description: 'Credit wallet management',
		color: '#22c55e',
		icon: '💰',
		methods: [
			{
				name: 'get',
				signature: 'wallets.get(walletId)',
				summary: 'Get wallet by ID',
				accessType: 'direct',
				requiresAuth: true,
				params: [{ name: 'walletId', type: 'string', required: true, description: 'Wallet ID' }],
				returns: 'Promise<APIResult<Wallet>>'
			},
			{
				name: 'getMine',
				signature: 'wallets.getMine()',
				summary: 'Get my wallet',
				description: 'Get the wallet for the current user',
				accessType: 'direct',
				requiresAuth: true,
				params: [],
				returns: 'Promise<APIResult<Wallet | null>>'
			},
			{
				name: 'listEntries',
				signature: 'wallets.listEntries(walletId, options?)',
				summary: 'List wallet ledger entries',
				accessType: 'direct',
				requiresAuth: true,
				params: [
					{ name: 'walletId', type: 'string', required: true, description: 'Wallet ID' },
					{ name: 'options', type: 'QueryOptions', required: false, description: 'Query options' }
				],
				returns: 'Promise<APIResult<LedgerEntry[]>>'
			},
			{
				name: 'addCredits',
				signature: 'wallets.addCredits({ amount, idempotencyKey, paymentRef? })',
				summary: 'Add credits to wallet',
				description: 'Add credits to the current user wallet',
				accessType: 'delegated',
				requiresAuth: true,
				params: [
					{
						name: 'input',
						type: '{ amount: number; idempotencyKey: string; paymentRef?: string | null }',
						required: true,
						description: 'Top-up payload with required idempotency key'
					}
				],
				returns: 'Promise<APIResult<{ id: string; idempotent: boolean; newBalance: number }>>',
				example: {
					call: 'await client.wallets.addCredits({ amount: 100, idempotencyKey: "topup_123" })',
					response: { id: 'idemp_abc', idempotent: false, newBalance: 150 }
				}
			}
		]
	},

	// ============ Voice ============
	{
		name: 'voice',
		description: 'Speech-to-text and text-to-speech',
		color: '#ec4899',
		icon: '🎤',
		methods: [
			{
				name: 'transcribe',
				signature: 'voice.transcribe(audioBlob)',
				summary: 'Transcribe audio',
				description: 'Convert audio to text (Speech-to-Text)',
				accessType: 'delegated',
				requiresAuth: true,
				params: [
					{ name: 'audioBlob', type: 'Blob', required: true, description: 'Audio file blob' }
				],
				returns: 'Promise<APIResult<TranscriptionResult>>',
				example: {
					call: 'await client.voice.transcribe(audioBlob)',
					response: {
						text: 'I believe the main argument here is...',
						confidence: 0.92,
						duration: 4.2
					}
				}
			},
			{
				name: 'synthesize',
				signature: 'voice.synthesize(text, voiceId?)',
				summary: 'Synthesize speech',
				description: 'Convert text to audio (Text-to-Speech)',
				accessType: 'delegated',
				requiresAuth: true,
				params: [
					{ name: 'text', type: 'string', required: true, description: 'Text to speak' },
					{
						name: 'voiceId',
						type: 'string',
						required: false,
						description: 'Voice ID for different voices'
					}
				],
				returns: 'Promise<APIResult<SynthesizeResult>>',
				example: {
					call: 'await client.voice.synthesize("Hello, welcome to Mentora.")',
					response: { audioContent: 'base64-encoded-audio', contentType: 'audio/mpeg' }
				}
			}
		]
	}
];

/**
 * Get modules grouped by access type
 */
export function getModulesByAccessType(): { direct: APIModule[]; delegated: APIModule[] } {
	const direct: APIModule[] = [];
	const delegated: APIModule[] = [];

	for (const module of apiModules) {
		const hasDirect = module.methods.some((m) => m.accessType === 'direct');
		const hasDelegated = module.methods.some((m) => m.accessType === 'delegated');

		if (hasDirect) direct.push(module);
		if (hasDelegated) delegated.push(module);
	}

	return { direct, delegated };
}

/**
 * Get method color based on access type
 */
export function getAccessTypeColor(accessType: AccessType): string {
	return accessType === 'direct' ? '#22c55e' : '#3b82f6';
}

/**
 * Get all methods flattened
 */
export function getAllMethods(): Array<APIMethod & { moduleName: string }> {
	return apiModules.flatMap((module) =>
		module.methods.map((method) => ({ ...method, moduleName: module.name }))
	);
}
