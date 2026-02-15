import type { RouteContext } from '../types.js';
import {
	FirestoreAnnouncementRepository,
	FirestoreAnalyticsRepository,
	FirestoreConversationRepository,
	FirestoreCourseRepository,
	FirestoreHealthRepository,
	FirestoreWalletRepository
} from '../repositories/firestore/index.js';
import { AnnouncementService } from './announcement-service.js';
import { AnalyticsService, parseDayWindow } from './analytics-service.js';
import { CatalogService } from './catalog-service.js';
import { ContentGenerationService } from './content-generation-service.js';
import { ConversationService } from './conversation-service.js';
import { CourseService } from './course-service.js';
import { FirestoreConversationLLMGateway } from './gateways/conversation-llm-gateway.js';
import { HealthService } from './health-service.js';
import { DefaultTopupVerificationGateway, WalletService } from './wallet-service.js';

export function createServiceContainer(ctx: RouteContext) {
	const courseRepository = new FirestoreCourseRepository(ctx.firestore);
	const announcementRepository = new FirestoreAnnouncementRepository(ctx.firestore);
	const walletRepository = new FirestoreWalletRepository(ctx.firestore);
	const conversationRepository = new FirestoreConversationRepository(ctx.firestore);
	const analyticsRepository = new FirestoreAnalyticsRepository(ctx.firestore);
	const healthRepository = new FirestoreHealthRepository(ctx.firestore);

	const announcementService = new AnnouncementService(courseRepository, announcementRepository);
	const courseService = new CourseService(courseRepository);
	const catalogService = new CatalogService(courseService, courseRepository);
	const conversationService = new ConversationService(
		conversationRepository,
		new FirestoreConversationLLMGateway(ctx.firestore)
	);
	const walletService = new WalletService(walletRepository, new DefaultTopupVerificationGateway());
	const analyticsService = new AnalyticsService(analyticsRepository);
	const healthService = new HealthService(healthRepository);
	const contentGenerationService = new ContentGenerationService();

	return {
		announcementService,
		courseService,
		catalogService,
		conversationService,
		walletService,
		analyticsService,
		healthService,
		contentGenerationService,
		parseDayWindow
	};
}
