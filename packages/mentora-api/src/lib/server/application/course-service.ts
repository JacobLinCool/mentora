import type {
	Assignment,
	CourseDoc,
	CourseMembership,
	Questionnaire,
	Topic
} from 'mentora-firebase';
import type { CreateResourceResult, JoinCourseResult } from '../../contracts/api.js';
import { errorResponse, HttpStatus, ServerErrorCode, type AuthContext } from '../types.js';
import type { ICourseRepository } from '../repositories/ports/course-repository.js';

export interface CreateCourseInput {
	title: string;
	code?: string;
	visibility?: CourseDoc['visibility'];
	theme?: CourseDoc['theme'];
	description?: CourseDoc['description'];
	isDemo?: boolean;
	demoPolicy?: CourseDoc['demoPolicy'];
}

export interface CopyCourseInput {
	title?: string;
	includeContent?: boolean;
	includeRoster?: boolean;
	isDemo?: boolean;
}

export interface JoinCourseInput {
	code: string;
}

function validateCourseCode(code: string): void {
	if (!/^[A-Z0-9]{6,64}$/.test(code.replace(/[-_]/g, ''))) {
		throw errorResponse(
			'Invalid course code format',
			HttpStatus.BAD_REQUEST,
			ServerErrorCode.INVALID_INPUT
		);
	}
}

export class CourseService {
	constructor(private readonly courseRepository: ICourseRepository) {}

	async requireCourseAccess(
		courseId: string,
		userId: string,
		resource: string,
		options?: { allowPublic?: boolean }
	): Promise<CourseDoc> {
		const course = await this.courseRepository.getCourseById(courseId);
		if (!course) {
			throw errorResponse('Course not found', HttpStatus.NOT_FOUND, ServerErrorCode.NOT_FOUND);
		}

		let hasAccess = options?.allowPublic === true && course.visibility === 'public';
		if (!hasAccess && course.ownerId === userId) {
			hasAccess = true;
		}
		if (!hasAccess) {
			const member = await this.courseRepository.getMembership(courseId, userId);
			hasAccess = member?.status === 'active';
		}

		if (!hasAccess) {
			throw errorResponse(
				`Not authorized to view course ${resource}`,
				HttpStatus.FORBIDDEN,
				ServerErrorCode.PERMISSION_DENIED
			);
		}
		return course;
	}

	async createCourse(user: AuthContext, input: CreateCourseInput): Promise<CreateResourceResult> {
		const sanitizedTitle = input.title.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
		const prefix = sanitizedTitle.length >= 3 ? sanitizedTitle.substring(0, 3) : 'CRS';
		const courseCode =
			input.code?.toUpperCase() || `${prefix}${Date.now().toString(36).toUpperCase()}`;

		validateCourseCode(courseCode);

		const now = Date.now();
		const result = await this.courseRepository.createCourseWithCodeLock({
			title: input.title,
			code: courseCode,
			ownerId: user.uid,
			ownerEmail: user.email,
			visibility: input.visibility || 'private',
			theme: input.theme ?? null,
			description: input.description ?? null,
			isDemo: input.isDemo || false,
			demoPolicy: input.demoPolicy ?? null,
			now
		});

		if (result.duplicateCode) {
			throw errorResponse(
				'Course code already exists',
				HttpStatus.CONFLICT,
				ServerErrorCode.ALREADY_EXISTS
			);
		}

		return { id: result.courseId };
	}

	async copyCourse(
		user: AuthContext,
		sourceCourseId: string,
		input: CopyCourseInput
	): Promise<CreateResourceResult> {
		const sourceCourse = await this.courseRepository.getCourseById(sourceCourseId);
		if (!sourceCourse) {
			throw errorResponse(
				'Source course not found',
				HttpStatus.NOT_FOUND,
				ServerErrorCode.NOT_FOUND
			);
		}

		if (sourceCourse.ownerId !== user.uid) {
			const member = await this.courseRepository.getMembership(sourceCourseId, user.uid);
			if (!member || member.status !== 'active' || member.role !== 'instructor') {
				throw errorResponse(
					'Not authorized to copy this course',
					HttpStatus.FORBIDDEN,
					ServerErrorCode.PERMISSION_DENIED
				);
			}
		}

		const now = Date.now();
		const newCourseId = this.courseRepository.allocateCourseId();
		const prefix = sourceCourse.code.substring(0, 50);
		const newCode = `${prefix}_CPY_${Math.random().toString(36).substring(2, 6)}`.toUpperCase();

		await this.courseRepository.createCopiedCourse({
			sourceCourseId,
			sourceCourse,
			newCourseId,
			newCourseCode: newCode,
			newOwnerId: user.uid,
			newOwnerEmail: user.email,
			title: input.title || `Copy of ${sourceCourse.title}`,
			now,
			isDemo: input.isDemo !== undefined ? input.isDemo : !!sourceCourse.isDemo
		});

		if (input.includeRoster) {
			const roster = await this.courseRepository.listRosterByRoles(sourceCourseId, [
				'instructor',
				'ta'
			]);
			await Promise.all(
				roster.map(async (member) => {
					if (member.userId === user.uid || member.status !== 'active') {
						return;
					}
					const invited: CourseMembership = {
						...member,
						joinedAt: null,
						status: 'invited'
					};
					if (!member.userId) {
						return;
					}
					await this.courseRepository.upsertMembership(newCourseId, member.userId, invited);
				})
			);
		}

		if (input.includeContent) {
			const snapshot = await this.courseRepository.loadCourseContent(sourceCourseId);
			const topicIdMap = new Map<string, string>();
			const assignmentIdMap = new Map<string, string>();
			const questionnaireIdMap = new Map<string, string>();

			for (const topic of snapshot.topics) {
				topicIdMap.set(topic.id, this.courseRepository.allocateTopicId());
			}
			for (const assignment of snapshot.assignments) {
				assignmentIdMap.set(assignment.id, this.courseRepository.allocateAssignmentId());
			}
			for (const questionnaire of snapshot.questionnaires) {
				questionnaireIdMap.set(questionnaire.id, this.courseRepository.allocateQuestionnaireId());
			}

			const topicWrites: Promise<void>[] = [];
			for (const oldTopic of snapshot.topics) {
				const newTopicId = topicIdMap.get(oldTopic.id);
				if (!newTopicId) continue;

				const remappedContents: string[] = [];
				const remappedContentTypes: Topic['contentTypes'] = [];
				for (let i = 0; i < oldTopic.contents.length; i++) {
					const contentId = oldTopic.contents[i];
					const contentType = oldTopic.contentTypes[i];
					if (!contentId || !contentType) continue;
					if (contentType === 'assignment') {
						const mappedId = assignmentIdMap.get(contentId);
						if (mappedId) {
							remappedContents.push(mappedId);
							remappedContentTypes.push(contentType);
						}
					} else if (contentType === 'questionnaire') {
						const mappedId = questionnaireIdMap.get(contentId);
						if (mappedId) {
							remappedContents.push(mappedId);
							remappedContentTypes.push(contentType);
						}
					}
				}

				const newTopic: Topic = {
					...oldTopic,
					id: newTopicId,
					courseId: newCourseId,
					contents: remappedContents,
					contentTypes: remappedContentTypes,
					createdBy: user.uid,
					createdAt: now,
					updatedAt: now
				};
				topicWrites.push(this.courseRepository.saveTopic(newTopicId, newTopic));
			}

			const assignmentWrites: Promise<void>[] = [];
			for (const oldAssignment of snapshot.assignments) {
				const newAssignmentId = assignmentIdMap.get(oldAssignment.id);
				if (!newAssignmentId) continue;
				const newTopicId = oldAssignment.topicId
					? topicIdMap.get(oldAssignment.topicId) || null
					: null;
				const newAssignment: Assignment = {
					...oldAssignment,
					id: newAssignmentId,
					courseId: newCourseId,
					topicId: newTopicId,
					createdBy: user.uid,
					createdAt: now,
					updatedAt: now
				};
				assignmentWrites.push(this.courseRepository.saveAssignment(newAssignmentId, newAssignment));
			}

			const questionnaireWrites: Promise<void>[] = [];
			for (const oldQuestionnaire of snapshot.questionnaires) {
				const newQuestionnaireId = questionnaireIdMap.get(oldQuestionnaire.id);
				if (!newQuestionnaireId) continue;
				const newTopicId = oldQuestionnaire.topicId
					? topicIdMap.get(oldQuestionnaire.topicId) || null
					: null;
				const newQuestionnaire: Questionnaire = {
					...oldQuestionnaire,
					id: newQuestionnaireId,
					courseId: newCourseId,
					topicId: newTopicId,
					createdBy: user.uid,
					createdAt: now,
					updatedAt: now
				};
				questionnaireWrites.push(
					this.courseRepository.saveQuestionnaire(newQuestionnaireId, newQuestionnaire)
				);
			}

			await Promise.all([...topicWrites, ...assignmentWrites, ...questionnaireWrites]);
		}

		return { id: newCourseId };
	}

	async joinByCode(user: AuthContext, input: JoinCourseInput): Promise<JoinCourseResult> {
		const normalizedCode = input.code.trim().toUpperCase();
		validateCourseCode(normalizedCode);

		const course = await this.courseRepository.findCourseByCode(normalizedCode);
		if (!course) {
			throw errorResponse(
				'Course not found with this code',
				HttpStatus.NOT_FOUND,
				ServerErrorCode.NOT_FOUND
			);
		}

		const existingMembership = await this.courseRepository.getMembership(course.id, user.uid);
		if (existingMembership) {
			if (existingMembership.status === 'active') {
				return {
					courseId: course.id,
					joined: false,
					alreadyMember: true
				};
			}

			await this.courseRepository.updateMembership(course.id, user.uid, {
				status: 'active',
				joinedAt: Date.now()
			});
			return {
				courseId: course.id,
				joined: true,
				alreadyMember: false
			};
		}

		const membership: CourseMembership = {
			userId: user.uid,
			email: user.email,
			role: 'student',
			status: 'active',
			joinedAt: Date.now(),
			invitedAt: null
		};
		await this.courseRepository.upsertMembership(course.id, user.uid, membership);
		return {
			courseId: course.id,
			joined: true
		};
	}
}
