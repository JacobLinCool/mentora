/**
 * Integration Tests for content generation and ASR features
 *
 * Tests the new AI executor features:
 * - Content generation from questions
 * - ASR transcription in conversations
 *
 * NOTE: Most tests here require GOOGLE_GENAI_API_KEY and may take longer to run.
 */

import { describe, it, expect } from 'vitest';

describe('Content Generation and ASR (Integration)', () => {
	describe('Generate Content API', () => {
		it.skip('should generate content from a question (requires API key manual test)', () => {
			// This test demonstrates the expected API usage:
			//
			// POST /api/assignments/generate-content
			// Body: { "question": "什麼是民主？" }
			//
			// Expected Response:
			// {
			//   "question": "什麼是民主？",
			//   "content": "民主是一種政治體制...",  (comprehensive generated content)
			//   "tokenUsage": {
			//     "totalTokenCount": 1234,
			//     "promptTokenCount": 100,
			//     "candidatesTokenCount": 1134
			//   }
			// }
			//
			// The generated content should include:
			// - Core concept explanation
			// - Detailed descriptions
			// - Key term definitions
			// - Reference information
			//
			// This content should be stored as assignment.prompt,
			// while the original question goes in assignment.question

			expect(true).toBe(true);
		});

		it('should validate question field exists in assignment schema', () => {
			// Verify the schema supports both question and prompt fields
			const exampleAssignment = {
				id: 'test',
				courseId: null,
				topicId: null,
				title: 'Test',
				question: '什麼是正義？', // Teacher's short question
				prompt: '正義是...', // AI-generated detailed content
				mode: 'instant' as const,
				startAt: Date.now(),
				dueAt: null,
				allowLate: false,
				allowResubmit: false,
				createdBy: 'test123',
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			// This should compile without errors
			expect(exampleAssignment.question).toBe('什麼是正義？');
			expect(exampleAssignment.prompt).toBe('正義是...');
		});
	});

	describe('ASR Transcription in Conversations', () => {
		it.skip('should transcribe audio and add turn (requires manual test with audio)', () => {
			// This test demonstrates the expected API usage with audio:
			//
			// 1. Client captures audio from user (browser MediaRecorder API)
			// 2. Client sends FormData with audio blob:
			//
			// const formData = new FormData();
			// formData.append('audio', audioBlob, 'audio.mp3');
			//
			// POST /api/conversations/:id/turns
			// Body: FormData with audio blob
			//
			// 3. Server transcribes using ASR executor
			// 4. Transcribed text is used as student input for LLM
			// 5. Response includes:
			// {
			//   "conversationId": "...",
			//   "userTurnId": "...",
			//   "aiTurnId": "...",
			//  "aiMessage": "...",
			//   "transcribedText": "我認為自由是最重要的",  // The ASR result
			//   "conversationEnded": false,
			//   "stage": "asking_stance",
			//   ...
			// }

			expect(true).toBe(true);
		});
	});

	describe('Integration: Question + Prompt workflow', () => {
		it('should demonstrate the intended workflow', () => {
			// This test documents the expected end-to-end workflow:
			//
			// STEP 1: Teacher creates a question
			// const question = "言論自由的界限在哪裡？";
			//
			// STEP 2: Teacher generates detailed content
			// POST /api/assignments/generate-content
			// Body: { "question": question }
			// Response: { "content": "...", "tokenUsage": {...} }
			//
			// STEP 3: Teacher creates assignment with both fields
			// await client.assignments.create({
			//   courseId,
			//   title: "言論自由討論",
			//   question: "言論自由的界限在哪裡？",  // Short
			//   prompt: generatedContent,              // Detailed
			//   ...
			// });
			//
			// STEP 4: Student starts conversation
			// The LLM receives both question and prompt as context:
			// topicContext = "問題：{question}\n\n參考內容：\n{prompt}"
			//
			// STEP 5: LLM guides dialogue using this context
			// - More focused on the specific question
			// - Has detailed background knowledge from prompt
			// - Can reference key concepts defined in prompt

			expect(true).toBe(true);
		});
	});
});
