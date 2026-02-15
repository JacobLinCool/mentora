import type { Firestore } from 'fires2rest';
import {
	Announcements,
	Courses,
	type AnnouncementDoc,
	type CourseAnnouncement,
	type CourseDoc
} from 'mentora-firebase';
import type {
	CreateAnnouncementRecipientsInput,
	IAnnouncementRepository
} from '../ports/announcement-repository.js';

type FirestoreDocSnapshot = {
	exists: boolean;
	data(): unknown;
};

type FirestoreTransaction = {
	get(ref: unknown): Promise<FirestoreDocSnapshot>;
	update(ref: unknown, data: unknown): void;
};

export class FirestoreAnnouncementRepository implements IAnnouncementRepository {
	constructor(private readonly firestore: Firestore) {}

	async appendCourseAnnouncement(
		courseId: string,
		courseAnnouncement: CourseAnnouncement,
		now: number
	): Promise<void> {
		await this.firestore.runTransaction(async (transaction: FirestoreTransaction) => {
			const courseRef = this.firestore.doc(Courses.docPath(courseId));
			const courseSnap = await transaction.get(courseRef);
			if (!courseSnap.exists) {
				throw new Error('Course not found');
			}

			const course = Courses.schema.parse(courseSnap.data());
			const nextAnnouncements = [...(course.announcements || []), courseAnnouncement];
			const updatedCourse: CourseDoc = {
				...course,
				announcements: nextAnnouncements,
				updatedAt: now
			};

			transaction.update(courseRef, {
				announcements: updatedCourse.announcements,
				updatedAt: updatedCourse.updatedAt
			});
		});
	}

	async createForRecipients(input: CreateAnnouncementRecipientsInput): Promise<void> {
		const recipientUserIds = Array.from(
			new Set(input.recipientUserIds.filter((id) => id.trim().length > 0))
		);
		if (recipientUserIds.length === 0) {
			return;
		}

		await Promise.all(
			recipientUserIds.map(async (recipientUserId) => {
				const docRef = this.firestore
					.collection(Announcements.collectionPath(recipientUserId))
					.doc();
				const announcementDoc: AnnouncementDoc = {
					type: input.type,
					payload: input.payload,
					actorId: input.actorId,
					isRead: false,
					readAt: null,
					createdAt: input.now,
					updatedAt: input.now
				};
				await docRef.set(Announcements.schema.parse(announcementDoc));
			})
		);
	}

	async markRead(userId: string, announcementId: string, now: number): Promise<boolean> {
		const docRef = this.firestore.doc(Announcements.docPath(userId, announcementId));
		const docSnap = await docRef.get();
		if (!docSnap.exists) {
			return false;
		}

		const existing = Announcements.schema.parse(docSnap.data());
		if (existing.isRead && existing.readAt !== null) {
			return true;
		}

		await docRef.update({
			isRead: true,
			readAt: now,
			updatedAt: now
		});
		return true;
	}

	async markAllRead(userId: string, now: number): Promise<number> {
		const snapshot = await this.firestore
			.collection(Announcements.collectionPath(userId))
			.where('isRead', '==', false)
			.get();

		if (snapshot.empty) {
			return 0;
		}

		await Promise.all(
			snapshot.docs.map((doc) =>
				this.firestore.doc(Announcements.docPath(userId, doc.id)).update({
					isRead: true,
					readAt: now,
					updatedAt: now
				})
			)
		);

		return snapshot.docs.length;
	}

	async getAnnouncement(
		userId: string,
		announcementId: string
	): Promise<(AnnouncementDoc & { id: string }) | null> {
		const docSnap = await this.firestore.doc(Announcements.docPath(userId, announcementId)).get();
		if (!docSnap.exists) {
			return null;
		}

		return {
			id: announcementId,
			...Announcements.schema.parse(docSnap.data())
		};
	}

	async getCourse(courseId: string): Promise<CourseDoc | null> {
		const docSnap = await this.firestore.doc(Courses.docPath(courseId)).get();
		if (!docSnap.exists) {
			return null;
		}
		return Courses.schema.parse(docSnap.data());
	}
}
