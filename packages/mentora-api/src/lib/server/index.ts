/**
 * Mentora API Server Module
 *
 * Framework-agnostic server-side handlers for the Mentora API.
 * Can be integrated with SvelteKit, Express, Hono, or any other framework.
 */

// Core handler
export * from './handler.js';

// Types
export * from './types.js';

// Auth utilities
export * from './auth.js';

// Validation schemas
export * from './schemas.js';

// Routes
export * from './routes/index.js';
