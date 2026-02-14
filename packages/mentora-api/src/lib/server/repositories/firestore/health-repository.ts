import type { Firestore } from 'fires2rest';
import { Courses } from 'mentora-firebase';
import type { IHealthRepository } from '../ports/health-repository.js';

export class FirestoreHealthRepository implements IHealthRepository {
	constructor(private readonly firestore: Firestore) {}

	async pingFirestore(): Promise<void> {
		await this.firestore.collection(Courses.collectionPath()).limit(1).get();
	}
}
