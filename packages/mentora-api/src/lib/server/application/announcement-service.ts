import type { CourseAnnouncement } from 'mentora-firebase';
import type { AuthContext } from '../types.js';
import { errorResponse, HttpStatus, ServerErrorCode } from '../types.js';
import type { IAnnouncementRepository } from '../repositories/ports/announcement-repository.js';
import type { ICourseRepository } from '../repositories/ports/course-repository.js';

const COURSE_ANNOUNCEMENT_PREVIEW_LIMIT = 300;

function toContentPreview(content: string): string {
	if (content.length <= COURSE_ANNOUNCEMENT_PREVIEW_LIMIT) {
		return content;
	}
	return `${content.slice(0, COURSE_ANNOUNCEMENT_PREVIEW_LIMIT - 3)}...`;
}

export class AnnouncementService {
	constructor(
		private readonly courseRepository: ICourseRepository,
		private readonly announcementRepository: IAnnouncementRepository
	) {}

	private async requireCourseAnnouncementWriteAccess(
		courseId: string,
		userId: string
	): Promise<{ id: string; title: string; ownerId: string }> {
		const course = await this.courseRepository.getCourseById(courseId);
		if (!course) {
			throw errorResponse('Course not found', HttpStatus.NOT_FOUND, ServerErrorCode.NOT_FOUND);
		}

		if (course.ownerId === userId) {
			return { id: courseId, title: course.title, ownerId: course.ownerId };
		}

		const membership = await this.courseRepository.getMembership(courseId, userId);
		const canWrite =
			membership?.status === 'active' &&
			(membership.role === 'instructor' || membership.role === 'ta');
		if (!canWrite) {
			throw errorResponse(
				'Not authorized to create course announcement',
				HttpStatus.FORBIDDEN,
				ServerErrorCode.PERMISSION_DENIED
			);
		}

		return { id: courseId, title: course.title, ownerId: course.ownerId };
	}

	async createCourseAnnouncement(
		user: AuthContext,
		courseId: string,
		content: string
	): Promise<CourseAnnouncement> {
		const normalizedContent = content.trim();
		if (normalizedContent.length === 0) {
			throw errorResponse(
				'Announcement content is required',
				HttpStatus.BAD_REQUEST,
				ServerErrorCode.INVALID_INPUT
			);
		}

		const course = await this.requireCourseAnnouncementWriteAccess(courseId, user.uid);
		const now = Date.now();

		const courseAnnouncement: CourseAnnouncement = {
			id: crypto.randomUUID(),
			content: normalizedContent,
			createdAt: now,
			updatedAt: now
		};

		await this.announcementRepository.appendCourseAnnouncement(course.id, courseAnnouncement, now);

		const roster = await this.courseRepository.listRosterByRoles(course.id, [
			'student',
			'auditor',
			'ta',
			'instructor'
		]);
		const recipientIds = new Set<string>();
		recipientIds.add(course.ownerId);

		for (const member of roster) {
			if (member.status !== 'active' || !member.userId) {
				continue;
			}
			recipientIds.add(member.userId);
		}

		recipientIds.delete(user.uid);
		await this.announcementRepository.createForRecipients({
			recipientUserIds: Array.from(recipientIds),
			actorId: user.uid,
			type: 'course_announcement',
			payload: {
				courseId: course.id,
				courseTitle: course.title,
				courseAnnouncementId: courseAnnouncement.id,
				contentPreview: toContentPreview(normalizedContent)
			},
			now
		});

		return courseAnnouncement;
	}

	async markAnnouncementRead(
		userId: string,
		announcementId: string
	): Promise<{ updated: boolean }> {
		const updated = await this.announcementRepository.markRead(userId, announcementId, Date.now());
		if (!updated) {
			throw errorResponse(
				'Announcement not found',
				HttpStatus.NOT_FOUND,
				ServerErrorCode.NOT_FOUND
			);
		}
		return { updated: true };
	}

	async markAllAnnouncementsRead(userId: string): Promise<{ updatedCount: number }> {
		const updatedCount = await this.announcementRepository.markAllRead(userId, Date.now());
		return { updatedCount };
	}
}
