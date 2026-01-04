<script lang="ts">
	/**
	 * Voice Chat - Integrated conversation testing with themes and custom prompts
	 *
	 * One-click conversation creation with predefined themes or custom prompts
	 */
	import { subscribeToAuth, type AuthState } from '$lib/explorer/firebase';
	import {
		conversationThemes,
		samplePrompts,
		type ConversationTheme
	} from '$lib/explorer/test-fixtures';
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

	// Theme & Prompt Configuration
	let selectedTheme = $state<ConversationTheme | null>(null);
	let systemPrompt = $state(samplePrompts.socraticDefault);
	let showPromptEditor = $state(false);

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
	 * Load a conversation theme
	 */
	function selectTheme(theme: ConversationTheme) {
		selectedTheme = theme;
		systemPrompt = theme.systemPrompt;
		// Auto-load first starter question
		if (theme.starterQuestions.length > 0) {
			currentInput = theme.starterQuestions[0];
		}
	}

	/**
	 * Load a preset prompt
	 */
	function loadPresetPrompt(prompt: string) {
		systemPrompt = prompt;
		showPromptEditor = true;
	}

	/**
	 * One-click: Create assignment + conversation and start chat
	 */
	async function quickStartConversation() {
		if (!authState.token) {
			chatError = '請先登入以建立對話';
			return;
		}

		chatStatus = 'creating';
		chatError = null;

		try {
			// Step 1: Create a test assignment first
			const assignmentTitle = selectedTheme
				? `${selectedTheme.emoji} ${selectedTheme.name}`
				: `測試對話 - ${new Date().toLocaleString('zh-TW')}`;

			const assignmentPrompt = systemPrompt || samplePrompts.socraticDefault;

			const assignmentResponse = await fetch(`${baseUrl}/api/assignments`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authState.token}`
				},
				body: JSON.stringify({
					title: assignmentTitle,
					prompt: assignmentPrompt,
					mode: 'instant',
					startAt: Date.now(),
					allowLate: true,
					allowResubmit: true,
					aiConfig: {
						model: 'gemini-2.0-flash',
						temperature: 0.7
					}
				})
			});

			if (!assignmentResponse.ok) {
				const errorData = await assignmentResponse.json().catch(() => ({}));
				throw new Error(errorData.message || `建立 Assignment 失敗: ${assignmentResponse.status}`);
			}

			const assignmentResult = await assignmentResponse.json();
			const assignmentId = assignmentResult.id || assignmentResult.data?.id;

			if (!assignmentId) {
				throw new Error('未能取得 Assignment ID');
			}

			// Step 2: Create conversation with the new assignment
			const conversationResponse = await fetch(`${baseUrl}/api/conversations`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authState.token}`
				},
				body: JSON.stringify({
					assignmentId: assignmentId
				})
			});

			if (!conversationResponse.ok) {
				const errorData = await conversationResponse.json().catch(() => ({}));
				throw new Error(errorData.message || `建立對話失敗: ${conversationResponse.status}`);
			}

			const conversationResult = await conversationResponse.json();
			conversationId = conversationResult.id || conversationResult.data?.id || '';

			if (conversationId) {
				messages = [
					{
						role: 'system',
						text: selectedTheme
							? `✅ 已開始「${selectedTheme.name}」對話！\n${selectedTheme.description}\n\n💡 試試這些問題：\n${selectedTheme.starterQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
							: `✅ 對話建立成功！\n📝 Assignment: ${assignmentTitle}\n🆔 Conversation: ${conversationId}`,
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

	function stopConversation() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
		conversationId = '';
		selectedTheme = null;
		chatStatus = 'idle';
		messages = [];
	}

	async function sendMessage() {
		if (!currentInput.trim() || chatStatus !== 'ready') return;

		if (!conversationId || !authState.token) {
			chatError = '請先建立對話';
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
	}

	function loadStarterQuestion(question: string) {
		currentInput = question;
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
		<h1>💬 Voice Chat</h1>
		<p>
			選擇主題一鍵開始對話，或自訂 Prompt 測試
			{#if !authState.user}<span class="auth-warning">⚠ 請先登入</span>{/if}
		</p>
	</header>

	<div class="chat-layout">
		<!-- Sidebar: Themes & Configuration -->
		<aside class="chat-sidebar">
			{#if chatStatus === 'idle' || chatStatus === 'error' || chatStatus === 'creating'}
				<!-- Theme Selection -->
				<div class="sidebar-section">
					<h3>🎯 對話主題</h3>
					<div class="themes-grid">
						{#each conversationThemes as theme}
							<button
								class="theme-card"
								class:selected={selectedTheme?.id === theme.id}
								onclick={() => selectTheme(theme)}
							>
								<div class="theme-header">
									<span class="theme-emoji">{theme.emoji}</span>
									<span class="theme-difficulty">{theme.difficulty}</span>
								</div>
								<div class="theme-name">{theme.name}</div>
								<div class="theme-category">{theme.category}</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Prompt Configuration -->
				<div class="sidebar-section">
					<div class="section-header-row">
						<h3>📝 System Prompt</h3>
						<button class="toggle-btn" onclick={() => (showPromptEditor = !showPromptEditor)}>
							{showPromptEditor ? '收起' : '展開'}
						</button>
					</div>

					{#if showPromptEditor}
						<div class="prompt-presets">
							<button onclick={() => loadPresetPrompt(samplePrompts.socraticDefault)}>
								Socratic
							</button>
							<button onclick={() => loadPresetPrompt(samplePrompts.philosophyGuide)}>
								Philosophy
							</button>
							<button onclick={() => loadPresetPrompt(samplePrompts.criticalThinking)}>
								Critical
							</button>
							<button onclick={() => loadPresetPrompt(samplePrompts.debatePartner)}>
								Debate
							</button>
						</div>
						<textarea bind:value={systemPrompt} rows="8" placeholder="輸入自訂 prompt..."
						></textarea>
					{:else}
						<div class="prompt-preview">
							{systemPrompt.substring(0, 100)}...
						</div>
					{/if}
				</div>

				<!-- Start Button -->
				<div class="sidebar-actions">
					<button
						class="action-btn primary large"
						onclick={quickStartConversation}
						disabled={!authState.user || chatStatus === 'creating'}
					>
						{#if chatStatus === 'creating'}
							⏳ 建立中...
						{:else}
							🚀 {selectedTheme ? `開始「${selectedTheme.name}」` : '開始對話'}
						{/if}
					</button>
				</div>
			{:else}
				<!-- Active Conversation Sidebar -->
				<div class="sidebar-section">
					<h3>💬 進行中</h3>
					<div class="status-display">
						<span
							class="status-badge"
							class:ready={chatStatus === 'ready'}
							class:streaming={chatStatus === 'streaming'}
						>
							{#if chatStatus === 'ready'}🟢 Ready
							{:else if chatStatus === 'streaming'}💬 Streaming...
							{/if}
						</span>
						{#if selectedTheme}
							<div class="current-theme">
								<span class="theme-emoji">{selectedTheme.emoji}</span>
								{selectedTheme.name}
							</div>
						{/if}
					</div>
				</div>

				<!-- Starter Questions -->
				{#if selectedTheme}
					<div class="sidebar-section">
						<h3>💡 引導問題</h3>
						<div class="starter-questions">
							{#each selectedTheme.starterQuestions as question}
								<button class="starter-btn" onclick={() => loadStarterQuestion(question)}>
									{question}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Actions -->
				<div class="sidebar-actions">
					<button class="action-btn secondary" onclick={stopConversation}> 🔄 重新開始 </button>
					<button class="action-btn" onclick={clearChat} disabled={messages.length === 0}>
						🗑️ 清除訊息
					</button>
				</div>
			{/if}

			<!-- Settings -->
			<div class="sidebar-section config-section">
				<h3>⚙️ 設定</h3>
				<label>
					<span>Base URL</span>
					<input type="text" bind:value={baseUrl} />
				</label>
			</div>
		</aside>

		<!-- Main Chat Area -->
		<main class="chat-main">
			<div class="messages-container">
				{#if messages.length === 0}
					<div class="empty-chat">
						<div class="empty-icon">💬</div>
						<h2>開始你的蘇格拉底對話</h2>
						<p>選擇一個主題，或自訂 prompt，然後點擊「開始對話」</p>
						{#if selectedTheme}
							<div class="selected-theme-preview">
								<span class="theme-emoji-large">{selectedTheme.emoji}</span>
								<h3>{selectedTheme.name}</h3>
								<p>{selectedTheme.description}</p>
							</div>
						{/if}
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
						: '請先開始對話...'}
					disabled={chatStatus !== 'ready'}
					rows="3"
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
		max-width: 1600px;
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
		margin-left: 0.5rem;
	}

	.chat-layout {
		display: flex;
		gap: 1.5rem;
		flex: 1;
		min-height: 0;
	}

	/* Sidebar Styles */
	.chat-sidebar {
		width: 360px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		overflow-y: auto;
		padding-right: 0.5rem;
	}

	.sidebar-section {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 1rem;
	}

	.sidebar-section h3 {
		font-size: 0.875rem;
		color: #94a3b8;
		margin: 0 0 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.section-header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.section-header-row h3 {
		margin: 0;
	}

	.toggle-btn {
		background: #334155;
		border: none;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		color: #94a3b8;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.toggle-btn:hover {
		background: #475569;
	}

	/* Theme Cards */
	.themes-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.theme-card {
		background: #0f172a;
		border: 2px solid #334155;
		border-radius: 8px;
		padding: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
	}

	.theme-card:hover {
		border-color: #3b82f6;
		background: #1e293b;
	}

	.theme-card.selected {
		border-color: #3b82f6;
		background: rgba(59, 130, 246, 0.1);
	}

	.theme-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.theme-emoji {
		font-size: 1.5rem;
	}

	.theme-difficulty {
		font-size: 0.625rem;
		color: #64748b;
		text-transform: uppercase;
	}

	.theme-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: #f8fafc;
		margin-bottom: 0.25rem;
	}

	.theme-category {
		font-size: 0.75rem;
		color: #94a3b8;
	}

	/* Prompt Editor */
	.prompt-presets {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.5rem;
		flex-wrap: wrap;
	}

	.prompt-presets button {
		background: #334155;
		border: none;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		color: #cbd5e1;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.prompt-presets button:hover {
		background: #475569;
	}

	.sidebar-section textarea {
		width: 100%;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 4px;
		padding: 0.5rem;
		color: #e2e8f0;
		font-family: 'SF Mono', Monaco, monospace;
		font-size: 0.75rem;
		resize: vertical;
	}

	.prompt-preview {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 4px;
		padding: 0.5rem;
		color: #94a3b8;
		font-size: 0.75rem;
		font-family: 'SF Mono', Monaco, monospace;
		line-height: 1.4;
	}

	/* Status & Current Theme */
	.status-display {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.status-badge {
		display: inline-block;
		padding: 0.375rem 0.75rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.status-badge.ready {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.status-badge.streaming {
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
	}

	.current-theme {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: #0f172a;
		border-radius: 6px;
		color: #f8fafc;
		font-size: 0.875rem;
	}

	/* Starter Questions */
	.starter-questions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.starter-btn {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 6px;
		padding: 0.625rem;
		color: #cbd5e1;
		font-size: 0.8125rem;
		text-align: left;
		cursor: pointer;
		line-height: 1.4;
		transition: all 0.2s;
	}

	.starter-btn:hover {
		border-color: #3b82f6;
		background: #1e293b;
	}

	/* Actions */
	.sidebar-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.action-btn {
		background: #334155;
		border: none;
		border-radius: 6px;
		padding: 0.75rem 1rem;
		color: #f8fafc;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-btn:hover:not(:disabled) {
		background: #475569;
	}

	.action-btn.primary {
		background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
	}

	.action-btn.primary:hover:not(:disabled) {
		background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
	}

	.action-btn.primary.large {
		font-size: 1rem;
		padding: 1rem 1.25rem;
	}

	.action-btn.secondary {
		background: #1e293b;
		border: 1px solid #334155;
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.config-section input {
		width: 100%;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 4px;
		padding: 0.5rem;
		color: #e2e8f0;
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}

	.config-section label span {
		font-size: 0.75rem;
		color: #94a3b8;
	}

	/* Main Chat Area */
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
		padding: 2rem;
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.empty-chat h2 {
		font-size: 1.5rem;
		color: #f8fafc;
		margin: 0 0 0.5rem;
	}

	.empty-chat p {
		margin: 0.25rem 0;
		color: #94a3b8;
	}

	.selected-theme-preview {
		margin-top: 2rem;
		padding: 1.5rem;
		background: #0f172a;
		border: 2px solid #3b82f6;
		border-radius: 12px;
		max-width: 400px;
	}

	.theme-emoji-large {
		font-size: 3rem;
		display: block;
		margin-bottom: 1rem;
	}

	.selected-theme-preview h3 {
		color: #f8fafc;
		margin: 0 0 0.5rem;
	}

	.selected-theme-preview p {
		color: #cbd5e1;
		font-size: 0.875rem;
	}

	.message {
		padding: 0.875rem 1.125rem;
		border-radius: 12px;
		max-width: 75%;
	}

	.message.user {
		background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
		color: white;
		align-self: flex-end;
		margin-left: auto;
	}

	.message.assistant {
		background: #334155;
		color: #e2e8f0;
		align-self: flex-start;
	}

	.message.system {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
		align-self: center;
		max-width: 90%;
		text-align: center;
		font-size: 0.875rem;
	}

	.message.streaming {
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.8;
		}
	}

	.message-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
		font-size: 0.75rem;
	}

	.message-role {
		font-weight: 600;
		opacity: 0.8;
	}

	.message-time {
		opacity: 0.5;
	}

	.message-content {
		line-height: 1.6;
		white-space: pre-wrap;
	}

	.cursor {
		animation: blink 1s infinite;
		font-weight: bold;
	}

	@keyframes blink {
		0%,
		50% {
			opacity: 1;
		}
		51%,
		100% {
			opacity: 0;
		}
	}

	.streaming-indicator {
		color: #3b82f6;
		font-style: italic;
	}

	.error-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: rgba(239, 68, 68, 0.1);
		border-top: 1px solid #334155;
		color: #ef4444;
		font-size: 0.875rem;
	}

	.error-bar button {
		margin-left: auto;
		background: transparent;
		border: 1px solid #ef4444;
		border-radius: 4px;
		padding: 0.25rem 0.75rem;
		color: #ef4444;
		cursor: pointer;
		font-size: 0.75rem;
	}

	.error-bar button:hover {
		background: rgba(239, 68, 68, 0.1);
	}

	.input-area {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		border-top: 1px solid #334155;
		background: #0f172a;
	}

	.input-area textarea {
		flex: 1;
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 0.75rem;
		color: #f8fafc;
		font-size: 0.9375rem;
		line-height: 1.5;
		resize: none;
		font-family: inherit;
	}

	.input-area textarea:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.input-area textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.send-btn {
		background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
		border: none;
		border-radius: 8px;
		padding: 0 1.5rem;
		color: white;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.9375rem;
	}

	.send-btn:hover:not(:disabled) {
		background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
		transform: translateY(-1px);
	}

	.send-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinner {
		display: inline-block;
		animation: spin 1s linear infinite;
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
