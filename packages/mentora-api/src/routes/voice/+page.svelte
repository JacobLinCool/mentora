<script lang="ts">
	/**
	 * Voice Chat - Test Gemini Live API for real-time voice conversations
	 *
	 * This page provides a test interface for voice-based Socratic dialogues
	 * using the streaming conversation API.
	 */
	import { subscribeToAuth, type AuthState } from '$lib/explorer/firebase';
	import { sampleStudentMessages, sampleAssignments } from '$lib/explorer/test-fixtures';
	import { onMount, onDestroy } from 'svelte';

	// Auth state
	let authState: AuthState = $state({
		user: null,
		token: null,
		loading: true,
		error: null
	});
	let unsubscribe: (() => void) | null = null;

	onMount(() => {
		unsubscribe = subscribeToAuth((newState) => {
			authState = newState;
		});
	});

	onDestroy(() => {
		unsubscribe?.();
		stopConversation();
	});

	// Configuration
	let baseUrl = $state('http://localhost:5173');
	let conversationId = $state('');
	let selectedAssignment = $state(sampleAssignments[0]);

	// Conversation state
	type ConversationStatus = 'idle' | 'connecting' | 'ready' | 'streaming' | 'error' | 'creating';
	let chatStatus: ConversationStatus = $state('idle');
	let messages: Array<{ role: 'user' | 'assistant' | 'system'; text: string; timestamp: number }> =
		$state([]);
	let currentInput = $state('');
	let streamingText = $state('');
	let chatError: string | null = $state(null);

	// SSE connection
	let eventSource: EventSource | null = null;

	/**
	 * Create a new conversation via API for testing
	 */
	async function createNewConversation() {
		if (!authState.token) {
			chatError = '請先登入以建立對話';
			return;
		}

		chatStatus = 'creating';
		chatError = null;

		try {
			// First, we need to create a submission for the assignment
			const response = await fetch(`${baseUrl}/api/conversations`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authState.token}`
				},
				body: JSON.stringify({
					assignmentId: selectedAssignment.id,
					title: `測試對話 - ${new Date().toLocaleString()}`
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `API error: ${response.status}`);
			}

			const result = await response.json();
			conversationId = result.data?.conversationId || result.conversationId || '';

			if (conversationId) {
				messages = [
					{
						role: 'system',
						text: `✅ 對話建立成功！ID: ${conversationId}`,
						timestamp: Date.now()
					}
				];
				chatStatus = 'ready';
			} else {
				throw new Error('未能取得對話 ID');
			}
		} catch (err) {
			chatError = err instanceof Error ? err.message : '建立對話失敗';
			chatStatus = 'error';
		}
	}

	async function startConversation() {
		if (!conversationId) {
			chatError = '請輸入對話 ID，或點擊「建立新對話」';
			return;
		}

		if (!authState.token) {
			chatError = '請先登入';
			return;
		}

		chatStatus = 'connecting';
		chatError = null;

		try {
			// Verify conversation exists by fetching it
			const response = await fetch(`${baseUrl}/api/conversations/${conversationId}`, {
				headers: {
					Authorization: `Bearer ${authState.token}`
				}
			});

			if (!response.ok) {
				if (response.status === 404) {
					throw new Error('對話不存在');
				}
				throw new Error(`API error: ${response.status}`);
			}

			messages = [
				{
					role: 'system',
					text: `已連接到對話 ${conversationId}`,
					timestamp: Date.now()
				}
			];
			chatStatus = 'ready';
		} catch (err) {
			chatError = err instanceof Error ? err.message : 'Failed to start conversation';
			chatStatus = 'error';
		}
	}

	function stopConversation() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
		chatStatus = 'idle';
	}

	async function sendMessage() {
		if (!currentInput.trim() || chatStatus !== 'ready') return;

		if (!conversationId || !authState.token) {
			chatError = '請先建立或連接對話';
			return;
		}

		const userMessage = currentInput.trim();
		currentInput = '';

		// Add user message
		messages = [...messages, { role: 'user', text: userMessage, timestamp: Date.now() }];

		// Real API call with streaming
		chatStatus = 'streaming';
		streamingText = '';

		try {
			const response = await fetch(`${baseUrl}/api/conversations/${conversationId}/stream`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authState.token}`
				},
				body: JSON.stringify({ text: userMessage })
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `API error: ${response.status}`);
			}

			// Handle SSE stream
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (reader) {
				let fullText = '';
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value);
					const lines = chunk.split('\n');

					for (const line of lines) {
						if (line.startsWith('data: ')) {
							try {
								const data = JSON.parse(line.slice(6));
								if (data.text) {
									fullText += data.text;
									streamingText = fullText;
								}
								if (data.done) {
									break;
								}
							} catch {
								// Ignore parse errors for incomplete chunks
							}
						}
					}
				}

				if (fullText) {
					messages = [...messages, { role: 'assistant', text: fullText, timestamp: Date.now() }];
				}
			}
		} catch (err) {
			chatError = err instanceof Error ? err.message : 'Failed to send message';
		} finally {
			streamingText = '';
			chatStatus = 'ready';
		}
	}

	function clearChat() {
		messages = [];
		if (chatStatus === 'ready') {
			messages = [
				{
					role: 'system',
					text: `已連接到對話 ${conversationId}`,
					timestamp: Date.now()
				}
			];
		}
	}

	function loadQuickMessage(text: string) {
		currentInput = text;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}
</script>

<div class="voice-page">
	<header class="page-header">
		<h1>🎙️ Voice Chat</h1>
		<p>
			即時測試 Gemini API 對話串流
			{#if !authState.user}<span class="auth-warning">⚠ 請先登入以使用完整功能</span>{/if}
		</p>
	</header>

	<div class="chat-layout">
		<!-- Sidebar: Config & Quick Actions -->
		<aside class="chat-sidebar">
			<div class="sidebar-section">
				<h3>Configuration</h3>
				<div class="config-form">
					<label>
						<span>Base URL</span>
						<input type="text" bind:value={baseUrl} />
					</label>
					<label>
						<span>Assignment Template</span>
						<select bind:value={selectedAssignment}>
							{#each sampleAssignments as assignment}
								<option value={assignment}>{assignment.name}</option>
							{/each}
						</select>
					</label>
					<label>
						<span>Conversation ID</span>
						<input type="text" bind:value={conversationId} placeholder="或建立新對話" />
					</label>
				</div>
			</div>

			<div class="sidebar-section">
				<h3>Status</h3>
				<div class="status-display">
					<span
						class="status-badge"
						class:idle={chatStatus === 'idle'}
						class:ready={chatStatus === 'ready'}
						class:streaming={chatStatus === 'streaming'}
						class:error={chatStatus === 'error'}
						class:creating={chatStatus === 'creating'}
					>
						{#if chatStatus === 'idle'}⚪ Idle
						{:else if chatStatus === 'connecting'}🔄 Connecting...
						{:else if chatStatus === 'creating'}🔄 Creating...
						{:else if chatStatus === 'ready'}🟢 Ready
						{:else if chatStatus === 'streaming'}💬 Streaming...
						{:else}🔴 Error{/if}
					</span>
					{#if authState.user}
						<span class="auth-badge">✓ {authState.user.displayName}</span>
					{/if}
				</div>
			</div>

			<div class="sidebar-section">
				<h3>Quick Messages</h3>
				<div class="quick-messages">
					{#each sampleStudentMessages.slice(0, 5) as sample}
						<button class="quick-msg-btn" onclick={() => loadQuickMessage(sample.text)}>
							<span class="category">{sample.category}</span>
							{sample.text.substring(0, 30)}...
						</button>
					{/each}
				</div>
			</div>

			<div class="sidebar-actions">
				{#if chatStatus === 'idle' || chatStatus === 'error'}
					<button
						class="action-btn primary"
						onclick={createNewConversation}
						disabled={!authState.user}
					>
						🆕 建立新對話
					</button>
					<button
						class="action-btn secondary"
						onclick={startConversation}
						disabled={!conversationId || !authState.user}
					>
						🔗 連接現有對話
					</button>
				{:else if chatStatus === 'creating' || chatStatus === 'connecting'}
					<button class="action-btn" disabled> ⏳ 處理中... </button>
				{:else}
					<button class="action-btn secondary" onclick={stopConversation}> ⏹️ 停止 </button>
					<button class="action-btn" onclick={clearChat}> 🗑️ 清除 </button>
				{/if}
			</div>
		</aside>

		<!-- Main Chat Area -->
		<main class="chat-main">
			<div class="messages-container">
				{#if messages.length === 0}
					<div class="empty-chat">
						<div class="empty-icon">💬</div>
						<h2>開始對話</h2>
						<p>點擊「建立新對話」開始即時測試 Gemini API</p>
						<p class="hint">需要登入並確保 Mentora 服務正在運行</p>
					</div>
				{:else}
					{#each messages as msg}
						<div
							class="message"
							class:user={msg.role === 'user'}
							class:assistant={msg.role === 'assistant'}
							class:system={msg.role === 'system'}
						>
							<div class="message-header">
								<span class="message-role">
									{#if msg.role === 'user'}👤 You
									{:else if msg.role === 'assistant'}🤖 AI Tutor
									{:else}📢 System{/if}
								</span>
								<span class="message-time">
									{new Date(msg.timestamp).toLocaleTimeString()}
								</span>
							</div>
							<div class="message-content">{msg.text}</div>
						</div>
					{/each}

					{#if streamingText}
						<div class="message assistant streaming">
							<div class="message-header">
								<span class="message-role">🤖 AI Tutor</span>
								<span class="streaming-indicator">typing...</span>
							</div>
							<div class="message-content">{streamingText}<span class="cursor">▊</span></div>
						</div>
					{/if}
				{/if}
			</div>

			{#if chatError}
				<div class="error-bar">
					<span class="error-icon">❌</span>
					{chatError}
					<button onclick={() => (chatError = null)}>Dismiss</button>
				</div>
			{/if}

			<div class="input-area">
				<textarea
					bind:value={currentInput}
					onkeydown={handleKeydown}
					placeholder={chatStatus === 'ready'
						? 'Type your message... (Enter to send)'
						: 'Start a chat first...'}
					disabled={chatStatus !== 'ready'}
					rows="2"
				></textarea>
				<button
					class="send-btn"
					onclick={sendMessage}
					disabled={chatStatus !== 'ready' || !currentInput.trim()}
				>
					{#if chatStatus === 'streaming'}
						<span class="spinner">⏳</span>
					{:else}
						📤 Send
					{/if}
				</button>
			</div>
		</main>
	</div>
</div>

<style>
	.voice-page {
		max-width: 1400px;
		margin: 0 auto;
		height: calc(100vh - 120px);
		display: flex;
		flex-direction: column;
	}

	.page-header {
		margin-bottom: 1rem;
	}

	.page-header h1 {
		font-size: 2rem;
		color: #f8fafc;
		margin: 0 0 0.5rem;
	}

	.page-header p {
		color: #94a3b8;
		margin: 0;
	}

	.auth-warning {
		color: #f59e0b;
		font-size: 0.875rem;
		margin-left: 0.5rem;
	}

	.chat-layout {
		display: flex;
		gap: 1.5rem;
		flex: 1;
		min-height: 0;
	}

	.chat-sidebar {
		width: 280px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.sidebar-section {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 1rem;
	}

	.sidebar-section h3 {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
		margin: 0 0 0.75rem;
	}

	.config-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.config-form label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.config-form label span {
		font-size: 0.75rem;
		color: #94a3b8;
	}

	.config-form input {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 4px;
		padding: 0.5rem;
		color: #e2e8f0;
		font-size: 0.875rem;
	}

	.status-display {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.status-badge {
		padding: 0.375rem 0.75rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.status-badge.idle {
		background: #334155;
		color: #94a3b8;
	}

	.status-badge.ready {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.status-badge.streaming,
	.status-badge.creating {
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
	}

	.status-badge.error {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.auth-badge {
		font-size: 0.75rem;
		color: #22c55e;
	}

	.quick-messages {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.quick-msg-btn {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 4px;
		padding: 0.5rem;
		color: #94a3b8;
		font-size: 0.75rem;
		text-align: left;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.quick-msg-btn:hover {
		border-color: #3b82f6;
		color: #e2e8f0;
	}

	.quick-msg-btn .category {
		display: block;
		font-size: 0.65rem;
		color: #64748b;
		margin-bottom: 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.sidebar-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.action-btn {
		background: #334155;
		border: none;
		padding: 0.75rem;
		border-radius: 6px;
		color: #e2e8f0;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.action-btn:hover {
		background: #475569;
	}

	.action-btn.primary {
		background: #3b82f6;
	}

	.action-btn.primary:hover {
		background: #2563eb;
	}

	.action-btn.secondary {
		background: #ef4444;
	}

	.action-btn.secondary:hover {
		background: #dc2626;
	}

	.chat-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 8px;
		min-height: 0;
	}

	.messages-container {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.empty-chat {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		color: #64748b;
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.empty-chat h2 {
		font-size: 1.25rem;
		color: #f8fafc;
		margin: 0 0 0.5rem;
	}

	.empty-chat p {
		margin: 0;
	}

	.empty-chat .hint {
		font-size: 0.75rem;
		margin-top: 0.5rem;
		color: #475569;
	}

	.message {
		padding: 0.75rem 1rem;
		border-radius: 8px;
		max-width: 80%;
	}

	.message.user {
		background: #3b82f6;
		color: white;
		align-self: flex-end;
	}

	.message.assistant {
		background: #334155;
		color: #e2e8f0;
		align-self: flex-start;
	}

	.message.system {
		background: rgba(245, 158, 11, 0.1);
		border: 1px dashed #f59e0b;
		color: #f59e0b;
		align-self: center;
		font-size: 0.875rem;
		max-width: 100%;
	}

	.message-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
		font-size: 0.75rem;
		opacity: 0.8;
	}

	.message-role {
		font-weight: 500;
	}

	.message-time {
		opacity: 0.6;
	}

	.message-content {
		line-height: 1.5;
	}

	.streaming-indicator {
		color: #3b82f6;
		animation: pulse 1s infinite;
	}

	.cursor {
		animation: blink 0.8s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
	}

	.error-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: rgba(239, 68, 68, 0.1);
		border-top: 1px solid #ef4444;
		color: #ef4444;
		font-size: 0.875rem;
	}

	.error-bar button {
		margin-left: auto;
		background: transparent;
		border: 1px solid #ef4444;
		color: #ef4444;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.input-area {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		border-top: 1px solid #334155;
	}

	.input-area textarea {
		flex: 1;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 6px;
		padding: 0.75rem;
		color: #e2e8f0;
		font-size: 0.875rem;
		resize: none;
		font-family: inherit;
	}

	.input-area textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.send-btn {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s ease;
		white-space: nowrap;
	}

	.send-btn:hover:not(:disabled) {
		background: #2563eb;
	}

	.send-btn:disabled {
		background: #64748b;
		cursor: not-allowed;
	}

	.spinner {
		animation: spin 1s linear infinite;
		display: inline-block;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
