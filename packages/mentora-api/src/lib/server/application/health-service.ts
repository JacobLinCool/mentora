import type { IHealthRepository } from '../repositories/ports/health-repository.js';

export class HealthService {
	constructor(private readonly healthRepository: IHealthRepository) {}

	rootHealth() {
		return {
			status: 'ok',
			timestamp: Date.now()
		};
	}

	async firestoreHealth() {
		await this.healthRepository.pingFirestore();
		return {
			status: 'ok',
			service: 'firestore',
			timestamp: Date.now()
		};
	}
}
