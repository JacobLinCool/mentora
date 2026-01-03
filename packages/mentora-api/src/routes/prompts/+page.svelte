<script lang="ts">
	// Prompt Lab - Test and refine LLM prompts
	import { subscribeToAuth, type AuthState } from '$lib/explorer/firebase';
	import {
		quickStartConfigs,
		samplePrompts,
		sampleStudentMessages,
		sampleAssignments,
		type QuickStartConfig
	} from '$lib/explorer/test-fixtures';
	import { onMount, onDestroy } from 'svelte';

	// Auth state
	let authState = $state<AuthState>({
		user: null,
		token: null,
		loading: true,
		error: null
	});
	let unsubscribe: (() => void) | null = null;

	onMount(() => {
		unsubscribe = subscribeToAuth((state) => {
			authState = state;
		});
	});

	onDestroy(() => {
		unsubscribe?.();
	});

	// State
	let systemPrompt = $state(samplePrompts.socraticDefault);
	let studentMessage = $state('I believe technology is making us more connected but less human.');
	let dialecticalStrategy = $state<'clarify' | 'challenge' | 'devils_advocate'>('challenge');
	let conversationHistory = $state<Array<{ role: 'user' | 'model'; text: string }>>([]);

	let baseUrl = $state('http://localhost:5173');
	let selectedAssignment = $state(sampleAssignments[0]);

	// Response state
	let isLoading = $state(false);
	let aiResponse = $state<string | null>(null);
	let tokenUsage = $state<{ input: number; output: number } | null>(null);
	let error = $state<string | null>(null);

	// Preset prompts (use from test-fixtures)
	const presetPrompts = [
		{ name: 'Socratic Tutor', prompt: samplePrompts.socraticDefault },
		{ name: 'Philosophy Guide', prompt: samplePrompts.philosophyGuide },
		{ name: 'Critical Thinking', prompt: samplePrompts.criticalThinking },
		{ name: 'Debate Partner', prompt: samplePrompts.debatePartner }
	];

	function loadQuickStart(config: QuickStartConfig) {
		systemPrompt = config.systemPrompt;
		studentMessage = config.studentMessage;
		dialecticalStrategy = config.strategy;
	}

	function loadPreset(prompt: string) {
		systemPrompt = prompt;
	}

	function loadSampleMessage(message: string) {
		studentMessage = message;
	}

	async function testPrompt() {
		isLoading = true;
		aiResponse = null;
		error = null;
		tokenUsage = null;

		try {
			// Use the preview endpoint with selected assignment
			const res = await fetch(`${baseUrl}/api/assignments/${selectedAssignment.id}/preview`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(authState.token ? { Authorization: `Bearer ${authState.token}` } : {})
				},
				body: JSON.stringify({
					studentMessage,
					strategy: dialecticalStrategy,
					// Include custom prompt if modified from default
					customPrompt: systemPrompt !== samplePrompts.socraticDefault ? systemPrompt : undefined
				})
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.message || `API error: ${res.status} ${res.statusText}`);
			}

			const data = await res.json();
			aiResponse = data.response?.text || data.text || JSON.stringify(data);
			tokenUsage = data.response?.tokenUsage || data.tokenUsage;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Request failed';
		} finally {
			isLoading = false;
		}
	}

	function addToHistory() {
		if (studentMessage && aiResponse) {
			conversationHistory = [
				...conversationHistory,
				{ role: 'user', text: studentMessage },
				{ role: 'model', text: aiResponse }
			];
			studentMessage = '';
			aiResponse = null;
		}
	}

	function clearHistory() {
		conversationHistory = [];
	}
</script>

<div class="prompts-page">
	<header class="page-header">
		<h1>🤖 Prompt Lab</h1>
		<p>
			Test and refine LLM prompts for Socratic dialogue {#if !authState.user}<span
					class="auth-warning">⚠ 請先登入以測試 API</span
				>{/if}
		</p>
	</header>

	<!-- Quick Start -->
	<div class="quick-start-section">
		<h3>⚡ Quick Start</h3>
		<div class="quick-start-grid">
			{#each quickStartConfigs as config}
				<button class="quick-start-card" onclick={() => loadQuickStart(config)}>
					<span class="quick-start-name">{config.name}</span>
					<span class="quick-start-desc">{config.description}</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="config-bar">
		<div class="config-field">
			<label for="baseUrl">Base URL</label>
			<input id="baseUrl" type="text" bind:value={baseUrl} />
		</div>
		<div class="config-field">
			<label for="assignmentSelect">Assignment</label>
			<select id="assignmentSelect" bind:value={selectedAssignment}>
				{#each sampleAssignments as assignment}
					<option value={assignment}>{assignment.name}</option>
				{/each}
			</select>
		</div>
		<div class="config-field status-field">
			<span class="status-label">認證狀態</span>
			<div class="auth-status-display">
				{#if authState.user}
					<span class="status-indicator success">✓ {authState.user.displayName}</span>
				{:else}
					<span class="status-indicator warning">未登入</span>
				{/if}
			</div>
		</div>
	</div>

	<div class="lab-layout">
		<section class="prompt-section">
			<div class="section-header">
				<h2>System Prompt</h2>
				<div class="preset-buttons">
					{#each presetPrompts as preset}
						<button class="preset-btn" onclick={() => loadPreset(preset.prompt)}>
							{preset.name}
						</button>
					{/each}
				</div>
			</div>
			<textarea
				class="prompt-textarea"
				bind:value={systemPrompt}
				rows="12"
				placeholder="Enter your system prompt..."
			></textarea>
		</section>

		<section class="input-section">
			<div class="section-header">
				<h2>Student Message</h2>
				<select bind:value={dialecticalStrategy} class="strategy-select">
					<option value="clarify">🔍 Clarify</option>
					<option value="challenge">⚔️ Challenge</option>
					<option value="devils_advocate">😈 Devil's Advocate</option>
				</select>
			</div>

			<div class="sample-messages">
				{#each sampleStudentMessages as sample}
					<button class="sample-btn" onclick={() => loadSampleMessage(sample.text)}>
						<span class="sample-category">{sample.category}</span>
						"{sample.text.substring(0, 35)}..."
					</button>
				{/each}
			</div>

			<textarea
				class="message-textarea"
				bind:value={studentMessage}
				rows="4"
				placeholder="Enter a sample student message..."
			></textarea>

			<div class="action-buttons">
				<button class="test-btn" onclick={testPrompt} disabled={isLoading || !studentMessage}>
					{isLoading ? 'Testing...' : '🧪 Test Prompt'}
				</button>
			</div>
		</section>

		<section class="response-section">
			<div class="section-header">
				<h2>AI Response</h2>
				{#if tokenUsage}
					<span class="token-usage">
						Tokens: {tokenUsage.input} in / {tokenUsage.output} out
					</span>
				{/if}
			</div>

			{#if error}
				<div class="error-box">
					<span class="error-icon">❌</span>
					{error}
				</div>
			{:else if aiResponse}
				<div class="response-content">
					<pre class="response-text">{aiResponse}</pre>
					<button class="add-history-btn" onclick={addToHistory}> Add to History </button>
				</div>
			{:else}
				<div class="empty-response">Click "Test Prompt" to generate an AI response</div>
			{/if}
		</section>

		{#if conversationHistory.length > 0}
			<section class="history-section">
				<div class="section-header">
					<h2>Conversation History</h2>
					<button class="clear-btn" onclick={clearHistory}>Clear</button>
				</div>
				<div class="history-list">
					{#each conversationHistory as turn, i}
						<div class="history-turn" class:user={turn.role === 'user'}>
							<span class="turn-label">
								{turn.role === 'user' ? '👤 Student' : '🤖 AI'}
							</span>
							<p>{turn.text}</p>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	</div>
</div>

<style>
	.prompts-page {
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 1.5rem;
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

	.quick-start-section {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #1e293b;
		border-radius: 8px;
		border: 1px solid #334155;
	}

	.quick-start-section h3 {
		font-size: 0.875rem;
		color: #f8fafc;
		margin: 0 0 0.75rem;
	}

	.quick-start-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
	}

	.quick-start-card {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 6px;
		padding: 0.75rem;
		cursor: pointer;
		text-align: left;
		transition: all 0.15s ease;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.quick-start-card:hover {
		border-color: #3b82f6;
		background: #1e293b;
	}

	.quick-start-name {
		color: #f8fafc;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.quick-start-desc {
		color: #64748b;
		font-size: 0.75rem;
	}

	.config-bar {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #1e293b;
		border-radius: 8px;
		border: 1px solid #334155;
		flex-wrap: wrap;
	}

	.config-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.config-field label,
	.config-field .status-label {
		font-size: 0.75rem;
		color: #64748b;
	}

	.config-field input,
	.config-field select {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 4px;
		padding: 0.5rem 0.75rem;
		color: #e2e8f0;
		font-size: 0.875rem;
		width: 200px;
	}

	.status-field {
		flex: 1;
	}

	.auth-status-display {
		padding: 0.5rem 0.75rem;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-indicator.success {
		color: #22c55e;
	}

	.status-indicator.warning {
		color: #f59e0b;
	}

	.lab-layout {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.section-header h2 {
		font-size: 1rem;
		color: #f8fafc;
		margin: 0;
	}

	.preset-buttons {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.preset-btn {
		background: #334155;
		border: none;
		padding: 0.375rem 0.75rem;
		border-radius: 4px;
		color: #e2e8f0;
		font-size: 0.75rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.preset-btn:hover {
		background: #475569;
	}

	.prompt-section,
	.input-section,
	.response-section,
	.history-section {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 1rem;
	}

	.prompt-textarea,
	.message-textarea {
		width: 100%;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 4px;
		padding: 0.75rem;
		color: #e2e8f0;
		font-family: 'SF Mono', Monaco, monospace;
		font-size: 0.8rem;
		resize: vertical;
	}

	.strategy-select {
		background: #334155;
		border: none;
		padding: 0.375rem 0.75rem;
		border-radius: 4px;
		color: #e2e8f0;
		font-size: 0.875rem;
		cursor: pointer;
	}

	.sample-messages {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 0.75rem;
	}

	.sample-btn {
		background: transparent;
		border: 1px dashed #334155;
		padding: 0.5rem 0.75rem;
		border-radius: 4px;
		color: #94a3b8;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.sample-btn:hover {
		border-color: #3b82f6;
		color: #3b82f6;
	}

	.sample-category {
		font-size: 0.65rem;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.action-buttons {
		margin-top: 1rem;
		display: flex;
		gap: 0.75rem;
	}

	.test-btn {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.625rem 1.5rem;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.test-btn:hover:not(:disabled) {
		background: #2563eb;
	}

	.test-btn:disabled {
		background: #64748b;
		cursor: not-allowed;
	}

	.token-usage {
		font-size: 0.75rem;
		color: #64748b;
	}

	.response-content {
		position: relative;
	}

	.response-text {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 4px;
		padding: 1rem;
		margin: 0;
		white-space: pre-wrap;
		font-family: inherit;
		font-size: 0.9rem;
		color: #e2e8f0;
		line-height: 1.6;
	}

	.add-history-btn {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: #475569;
		border: none;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		color: #e2e8f0;
		font-size: 0.7rem;
		cursor: pointer;
	}

	.add-history-btn:hover {
		background: #64748b;
	}

	.empty-response {
		color: #64748b;
		text-align: center;
		padding: 2rem;
	}

	.error-box {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid #ef4444;
		border-radius: 4px;
		padding: 1rem;
		color: #ef4444;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.clear-btn {
		background: transparent;
		border: 1px solid #334155;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		color: #94a3b8;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.clear-btn:hover {
		border-color: #ef4444;
		color: #ef4444;
	}

	.history-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.history-turn {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 4px;
		padding: 0.75rem;
	}

	.history-turn.user {
		border-left: 3px solid #3b82f6;
	}

	.turn-label {
		font-size: 0.75rem;
		color: #64748b;
		display: block;
		margin-bottom: 0.5rem;
	}

	.history-turn p {
		margin: 0;
		color: #e2e8f0;
		font-size: 0.875rem;
		line-height: 1.5;
	}
</style>
