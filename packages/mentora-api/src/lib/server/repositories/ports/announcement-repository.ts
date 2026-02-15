import type { AnnouncementDoc, CourseAnnouncement, CourseDoc } from 'mentora-firebase';

export interface CreateAnnouncementRecipientsInput {
	recipientUserIds: string[];
	actorId: string;
	type: AnnouncementDoc['type'];
	payload: AnnouncementDoc['payload'];
	now: number;
}

export interface IAnnouncementRepository {
	appendCourseAnnouncement(
		courseId: string,
		courseAnnouncement: CourseAnnouncement,
		now: number
	): Promise<void>;
	createForRecipients(input: CreateAnnouncementRecipientsInput): Promise<void>;
	markRead(userId: string, announcementId: string, now: number): Promise<boolean>;
	markAllRead(userId: string, now: number): Promise<number>;
	getAnnouncement(
		userId: string,
		announcementId: string
	): Promise<(AnnouncementDoc & { id: string }) | null>;
	getCourse(courseId: string): Promise<CourseDoc | null>;
}
