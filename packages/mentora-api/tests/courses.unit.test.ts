import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MentoraAPIConfig } from '../src/lib/api/types.js';

type FirestoreModuleMocks = {
	doc: ReturnType<typeof vi.fn>;
	getDoc: ReturnType<typeof vi.fn>;
	getDocs: ReturnType<typeof vi.fn>;
	setDoc: ReturnType<typeof vi.fn>;
	updateDoc: ReturnType<typeof vi.fn>;
	deleteDoc: ReturnType<typeof vi.fn>;
	collection: ReturnType<typeof vi.fn>;
	collectionGroup: ReturnType<typeof vi.fn>;
	query: ReturnType<typeof vi.fn>;
	where: ReturnType<typeof vi.fn>;
	orderBy: ReturnType<typeof vi.fn>;
	limit: ReturnType<typeof vi.fn>;
	arrayUnion: ReturnType<typeof vi.fn>;
	Timestamp: { now: ReturnType<typeof vi.fn> };
	onSnapshot: ReturnType<typeof vi.fn>;
};

async function loadModules(): Promise<
	FirestoreModuleMocks & {
		courses: typeof import('../src/lib/api/courses.js');
	}
> {
	vi.resetModules();

	const doc = vi.fn((_db: unknown, ...segments: string[]) => ({
		kind: 'doc',
		path: segments.join('/'),
		id: segments[segments.length - 1]
	}));
	const getDoc = vi.fn();
	const getDocs = vi.fn();
	const setDoc = vi.fn();
	const updateDoc = vi.fn();
	const deleteDoc = vi.fn();
	const collection = vi.fn((_db: unknown, ...segments: string[]) => ({
		kind: 'collection',
		path: segments.join('/')
	}));
	const collectionGroup = vi.fn((_db: unknown, name: string) => ({
		kind: 'collectionGroup',
		name
	}));
	const query = vi.fn((target: unknown, ...constraints: unknown[]) => ({
		kind: 'query',
		target,
		constraints
	}));
	const where = vi.fn((field: string, op: string, value: unknown) => ({ field, op, value }));
	const orderBy = vi.fn((field: string, direction = 'asc') => ({ field, direction }));
	const limit = vi.fn((value: number) => ({ limit: value }));
	const arrayUnion = vi.fn((value: unknown) => ({ arrayUnion: value }));
	const Timestamp = { now: vi.fn(() => ({ toMillis: () => Date.now() })) };
	const onSnapshot = vi.fn();

	vi.doMock('firebase/firestore', () => ({
		doc,
		getDoc,
		getDocs,
		setDoc,
		updateDoc,
		deleteDoc,
		collection,
		collectionGroup,
		query,
		where,
		orderBy,
		limit,
		arrayUnion,
		Timestamp,
		onSnapshot
	}));

	const courses = await import('../src/lib/api/courses.js');
	return {
		doc,
		getDoc,
		getDocs,
		setDoc,
		updateDoc,
		deleteDoc,
		collection,
		collectionGroup,
		query,
		where,
		orderBy,
		limit,
		arrayUnion,
		Timestamp,
		onSnapshot,
		courses
	};
}

function createConfig(userId: string | null): MentoraAPIConfig {
	return {
		auth: {} as MentoraAPIConfig['auth'],
		db: {} as MentoraAPIConfig['db'],
		backendBaseUrl: 'http://api.test',
		environment: { browser: false },
		getCurrentUser: () =>
			userId
				? ({
						uid: userId,
						displayName: 'Test User',
						email: 'test@test.local',
						photoURL: null,
						getIdToken: vi.fn().mockResolvedValue('token')
					} as unknown as ReturnType<MentoraAPIConfig['getCurrentUser']>)
				: null
	};
}

const validCourse = {
	title: 'Test Course',
	code: 'TC1234',
	ownerId: 'teacher-1',
	visibility: 'private' as const,
	passwordHash: null,
	theme: null,
	description: null,
	thumbnail: null,
	isDemo: false,
	demoPolicy: null,
	announcements: [],
	createdAt: Date.now() - 120000,
	updatedAt: Date.now() - 60000
};

describe('Courses (Unit)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getCourse', () => {
		it('returns error when not found', async () => {
			const { getDoc, courses } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await courses.getCourse(createConfig('user-1'), 'course-1');
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Course not found');
		});

		it('returns parsed data with id on success', async () => {
			const { getDoc, courses } = await loadModules();
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				id: 'course-1',
				data: () => ({ ...validCourse })
			});

			const result = await courses.getCourse(createConfig('user-1'), 'course-1');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe('course-1');
				expect(result.data.title).toBe('Test Course');
			}
		});
	});

	describe('listMyCourses', () => {
		it('applies limit option', async () => {
			const { getDocs, limit, courses } = await loadModules();
			getDocs.mockResolvedValueOnce({ docs: [] });

			await courses.listMyCourses(createConfig('user-1'), { limit: 5 });
			expect(limit).toHaveBeenCalledWith(5);
		});
	});

	describe('inviteMember', () => {
		it('rejects when user is already active', async () => {
			const { getDocs, courses } = await loadModules();
			getDocs.mockResolvedValueOnce({
				empty: false,
				docs: [{ data: () => ({ status: 'active' }) }]
			});

			const result = await courses.inviteMember(
				createConfig('user-1'),
				'course-1',
				'test@test.local'
			);
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('User is already a member of this course');
		});

		it('rejects when user is already invited', async () => {
			const { getDocs, courses } = await loadModules();
			getDocs.mockResolvedValueOnce({
				empty: false,
				docs: [{ data: () => ({ status: 'invited' }) }]
			});

			const result = await courses.inviteMember(
				createConfig('user-1'),
				'course-1',
				'test@test.local'
			);
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('User has already been invited');
		});

		it('succeeds with empty query result and includes invitedAt', async () => {
			const { getDocs, setDoc, courses } = await loadModules();
			getDocs.mockResolvedValueOnce({ empty: true, docs: [] });
			setDoc.mockResolvedValueOnce(undefined);

			const result = await courses.inviteMember(
				createConfig('user-1'),
				'course-1',
				'NEW@TEST.LOCAL',
				'student'
			);
			expect(result.success).toBe(true);
			expect(setDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ invitedAt: expect.any(Number) })
			);
		});
	});

	describe('updateMember', () => {
		it('returns error when member not found', async () => {
			const { getDoc, courses } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await courses.updateMember(createConfig('user-1'), 'course-1', 'member-1', {
				role: 'ta'
			});
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Member not found');
		});

		it('rejects when member is course owner (userId === ownerId)', async () => {
			const { getDoc, courses } = await loadModules();
			// First call: member doc
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({
					userId: 'owner-user',
					email: 'owner@test.local',
					role: 'instructor',
					status: 'active',
					joinedAt: Date.now()
				})
			});
			// Second call: course doc
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ownerId: 'owner-user' })
			});

			const result = await courses.updateMember(createConfig('user-1'), 'course-1', 'member-1', {
				role: 'ta'
			});
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Cannot modify course owner');
		});

		it('succeeds for non-owner member', async () => {
			const { getDoc, updateDoc, courses } = await loadModules();
			const memberData = {
				userId: 'student-1',
				email: 'student@test.local',
				role: 'student',
				status: 'active',
				joinedAt: Date.now()
			};
			getDoc
				// First call: member doc
				.mockResolvedValueOnce({ exists: () => true, data: () => ({ ...memberData }) })
				// Second call: course doc (ownerId is different)
				.mockResolvedValueOnce({ exists: () => true, data: () => ({ ownerId: 'different-user' }) })
				// Third call: updated member doc
				.mockResolvedValueOnce({ exists: () => true, data: () => ({ ...memberData, role: 'ta' }) });
			updateDoc.mockResolvedValueOnce(undefined);

			const result = await courses.updateMember(createConfig('user-1'), 'course-1', 'member-1', {
				role: 'ta'
			});
			expect(result.success).toBe(true);
			expect(updateDoc).toHaveBeenCalled();
		});
	});

	describe('removeMember', () => {
		it('returns error when member not found', async () => {
			const { getDoc, courses } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await courses.removeMember(createConfig('user-1'), 'course-1', 'member-1');
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Member not found');
		});

		it('rejects when member is course owner (userId === ownerId)', async () => {
			const { getDoc, courses } = await loadModules();
			// First call: member doc
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({
					userId: 'owner-user',
					email: 'owner@test.local',
					role: 'instructor',
					status: 'active',
					joinedAt: Date.now()
				})
			});
			// Second call: course doc
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ownerId: 'owner-user' })
			});

			const result = await courses.removeMember(createConfig('user-1'), 'course-1', 'member-1');
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Cannot remove course owner');
		});

		it('soft-deletes by setting status to removed', async () => {
			const { getDoc, updateDoc, courses } = await loadModules();
			// First call: member doc
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ userId: 'student-1', role: 'student' })
			});
			// Second call: course doc (ownerId is different)
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ownerId: 'different-user' })
			});
			updateDoc.mockResolvedValueOnce(undefined);

			const result = await courses.removeMember(createConfig('user-1'), 'course-1', 'member-1');
			expect(result.success).toBe(true);
			expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { status: 'removed' });
		});
	});

	describe('updateCourse', () => {
		it('returns error when not found after update', async () => {
			const { getDoc, updateDoc, courses } = await loadModules();
			updateDoc.mockResolvedValueOnce(undefined);
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await courses.updateCourse(createConfig('user-1'), 'course-1', {
				title: 'New'
			});
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Course not found');
		});
	});

	describe('listMyEnrolledCourses', () => {
		it('filters out failed getCourse calls', async () => {
			const { getDocs, getDoc, courses } = await loadModules();
			getDocs.mockResolvedValueOnce({
				docs: [
					{ ref: { path: 'courses/c1/roster/m1' }, data: () => ({}) },
					{ ref: { path: 'courses/c2/roster/m2' }, data: () => ({}) }
				]
			});
			// First getCourse succeeds, second fails
			getDoc
				.mockResolvedValueOnce({ exists: () => true, id: 'c1', data: () => ({ ...validCourse }) })
				.mockResolvedValueOnce({ exists: () => false });

			const result = await courses.listMyEnrolledCourses(createConfig('user-1'));
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toHaveLength(1);
				expect(result.data[0].id).toBe('c1');
			}
		});
	});

	describe('listAllEnrolledCourses', () => {
		it('filters by student/auditor role only', async () => {
			const { getDocs, getDoc, courses } = await loadModules();
			getDocs.mockResolvedValueOnce({
				docs: [
					{ ref: { path: 'courses/c1/roster/m1' }, data: () => ({ role: 'student' }) },
					{ ref: { path: 'courses/c2/roster/m2' }, data: () => ({ role: 'instructor' }) },
					{ ref: { path: 'courses/c3/roster/m3' }, data: () => ({ role: 'auditor' }) }
				]
			});
			// Only c1 and c3 should be fetched
			getDoc
				.mockResolvedValueOnce({ exists: () => true, id: 'c1', data: () => ({ ...validCourse }) })
				.mockResolvedValueOnce({ exists: () => true, id: 'c3', data: () => ({ ...validCourse }) });

			const result = await courses.listAllEnrolledCourses(createConfig('user-1'));
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toHaveLength(2);
			}
		});
	});

	describe('createAnnouncement', () => {
		it('appends announcement with arrayUnion', async () => {
			const { updateDoc, courses } = await loadModules();
			updateDoc.mockResolvedValueOnce(undefined);

			// Mock crypto.randomUUID
			const originalRandomUUID = crypto.randomUUID;
			crypto.randomUUID = vi.fn().mockReturnValue('mock-uuid');

			const result = await courses.createAnnouncement(
				createConfig('user-1'),
				'course-1',
				'Hello class!'
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.content).toBe('Hello class!');
				expect(result.data.id).toBe('mock-uuid');
			}
			expect(updateDoc).toHaveBeenCalled();

			crypto.randomUUID = originalRandomUUID;
		});
	});
});
