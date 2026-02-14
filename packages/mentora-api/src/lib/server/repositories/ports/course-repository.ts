import type {
	Assignment,
	CourseDoc,
	CourseMembership,
	Questionnaire,
	Topic
} from 'mentora-firebase';

export interface CourseContentSnapshot {
	topics: Topic[];
	assignments: Assignment[];
	questionnaires: Questionnaire[];
}

export interface CourseQueryResult {
	id: string;
	data: CourseDoc;
}

export interface CreateCourseParams {
	title: string;
	code: string;
	ownerId: string;
	ownerEmail: string;
	visibility: CourseDoc['visibility'];
	theme: CourseDoc['theme'];
	description: CourseDoc['description'];
	isDemo: boolean;
	demoPolicy: CourseDoc['demoPolicy'];
	now: number;
}

export interface CreateCourseResult {
	courseId: string;
	duplicateCode: boolean;
}

export interface CopyCourseParams {
	sourceCourseId: string;
	sourceCourse: CourseDoc;
	newCourseId: string;
	newCourseCode: string;
	newOwnerId: string;
	newOwnerEmail: string;
	title: string;
	now: number;
	isDemo: boolean;
}

export interface RemappedTopicInput {
	topic: Topic;
}

export interface RemappedAssignmentInput {
	assignment: Assignment;
}

export interface RemappedQuestionnaireInput {
	questionnaire: Questionnaire;
}

export interface ICourseRepository {
	getCourseById(courseId: string): Promise<CourseDoc | null>;
	findCourseByCode(code: string): Promise<CourseQueryResult | null>;
	getMembership(courseId: string, userId: string): Promise<CourseMembership | null>;
	createCourseWithCodeLock(params: CreateCourseParams): Promise<CreateCourseResult>;
	createCopiedCourse(params: CopyCourseParams): Promise<void>;
	upsertMembership(courseId: string, memberId: string, membership: CourseMembership): Promise<void>;
	updateMembership(
		courseId: string,
		memberId: string,
		updates: Partial<Pick<CourseMembership, 'status' | 'joinedAt'>>
	): Promise<void>;
	listRosterByRoles(
		courseId: string,
		roles: CourseMembership['role'][]
	): Promise<CourseMembership[]>;
	loadCourseContent(courseId: string): Promise<CourseContentSnapshot>;
	allocateCourseId(): string;
	allocateTopicId(): string;
	allocateAssignmentId(): string;
	allocateQuestionnaireId(): string;
	saveTopic(topicId: string, topic: Topic): Promise<void>;
	saveAssignment(assignmentId: string, assignment: Assignment): Promise<void>;
	saveQuestionnaire(questionnaireId: string, questionnaire: Questionnaire): Promise<void>;
	listTopicsByCourse(courseId: string, limit?: number): Promise<Topic[]>;
	listAssignmentsByCourse(
		courseId: string,
		available: boolean,
		limit?: number
	): Promise<Assignment[]>;
	listQuestionnairesByCourse(
		courseId: string,
		available: boolean,
		limit?: number
	): Promise<Questionnaire[]>;
}
