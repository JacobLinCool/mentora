import type { Assignment, Questionnaire, Topic } from 'mentora-firebase';
import type { CourseService } from './course-service.js';
import type { ICourseRepository } from '../repositories/ports/course-repository.js';

export class CatalogService {
	constructor(
		private readonly courseService: CourseService,
		private readonly courseRepository: ICourseRepository
	) {}

	async listTopics(params: { courseId: string; userId: string; limit?: number }): Promise<Topic[]> {
		await this.courseService.requireCourseAccess(params.courseId, params.userId, 'topics', {
			allowPublic: true
		});
		return this.courseRepository.listTopicsByCourse(params.courseId, params.limit);
	}

	async listAssignments(params: {
		courseId: string;
		userId: string;
		available: boolean;
		limit?: number;
	}): Promise<Assignment[]> {
		await this.courseService.requireCourseAccess(params.courseId, params.userId, 'assignments');
		return this.courseRepository.listAssignmentsByCourse(
			params.courseId,
			params.available,
			params.limit
		);
	}

	async listQuestionnaires(params: {
		courseId: string;
		userId: string;
		available: boolean;
		limit?: number;
	}): Promise<Questionnaire[]> {
		await this.courseService.requireCourseAccess(params.courseId, params.userId, 'questionnaires');
		return this.courseRepository.listQuestionnairesByCourse(
			params.courseId,
			params.available,
			params.limit
		);
	}
}
