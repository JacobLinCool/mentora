export interface IHealthRepository {
	pingFirestore(): Promise<void>;
}
