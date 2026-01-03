<script lang="ts">
	// Prompt Lab - Test and refine LLM prompts

	// State
	let systemPrompt =
		$state(`You are a Socratic dialogue AI tutor. Your goal is to help students think critically about complex topics through thoughtful questioning.

Guidelines:
- Ask probing questions rather than giving direct answers
- Challenge assumptions and encourage deeper thinking
- Use one of these dialectical strategies: clarify, challenge, or devil's advocate
- Keep responses concise but thought-provoking`);

	let studentMessage = $state('I believe technology is making us more connected but less human.');
	let dialecticalStrategy = $state<'clarify' | 'challenge' | 'devils_advocate'>('challenge');
	let conversationHistory = $state<Array<{ role: 'user' | 'model'; text: string }>>([]);

	let baseUrl = $state('http://localhost:5173');
	let authToken = $state('');
	let assignmentId = $state('');

	// Response state
	let isLoading = $state(false);
	let aiResponse = $state<string | null>(null);
	let tokenUsage = $state<{ input: number; output: number } | null>(null);
	let error = $state<string | null>(null);

	// Preset prompts
	const presetPrompts = [
		{
			name: 'Socratic Tutor (Default)',
			prompt: `You are a Socratic dialogue AI tutor. Your goal is to help students think critically about complex topics through thoughtful questioning.

Guidelines:
- Ask probing questions rather than giving direct answers
- Challenge assumptions and encourage deeper thinking
- Use one of these dialectical strategies: clarify, challenge, or devil's advocate
- Keep responses concise but thought-provoking`
		},
		{
			name: 'Philosophy Guide',
			prompt: `You are a philosophy guide leading a Socratic dialogue. Help students explore fundamental questions about existence, knowledge, ethics, and meaning.

Your approach:
- Use the Socratic method of questioning
- Reference relevant philosophical traditions when appropriate
- Help students recognize logical fallacies in their reasoning
- Encourage students to define key terms precisely`
		},
		{
			name: 'Critical Thinking Coach',
			prompt: `You are a critical thinking coach. Your role is to help students develop stronger analytical skills through structured questioning.

Focus areas:
- Identify hidden assumptions
- Evaluate evidence quality
- Consider alternative perspectives
- Recognize cognitive biases
- Improve logical reasoning`
		},
		{
			name: 'Debate Partner',
			prompt: `You are a skilled debate partner. Take the opposing position to whatever the student argues, helping them strengthen their arguments.

Rules:
- Always argue the opposite position respectfully
- Point out weaknesses in their reasoning
- Provide counterarguments and counter-examples
- Help them anticipate objections to their position`
		}
	];

	const sampleMessages = [
		'I believe technology is making us more connected but less human.',
		'Democracy is the best form of government for all societies.',
		'Artificial intelligence will eventually replace most human jobs.',
		'Climate change is primarily caused by human activities.',
		'Social media does more harm than good to society.',
		'Free will is an illusion - our choices are determined by prior causes.'
	];

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
			// Use the preview endpoint if assignmentId is provided
			if (assignmentId) {
				const res = await fetch(`${baseUrl}/api/assignments/${assignmentId}/preview`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
					},
					body: JSON.stringify({
						studentMessage,
						strategy: dialecticalStrategy
					})
				});

				if (!res.ok) {
					throw new Error(`API error: ${res.status} ${res.statusText}`);
				}

				const data = await res.json();
				aiResponse = data.response?.text || data.text || JSON.stringify(data);
				tokenUsage = data.response?.tokenUsage || data.tokenUsage;
			} else {
				// Direct test without assignment (simulated for demo)
				aiResponse = `[Demo Mode - No API Call]\n\nTo test with actual AI responses:\n1. Enter an Assignment ID\n2. Provide your Auth Token\n3. Ensure the API server is running\n\nYour prompt would be:\n---\n${systemPrompt}\n---\n\nStudent message: "${studentMessage}"\nStrategy: ${dialecticalStrategy}`;
			}
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
		<p>Test and refine LLM prompts for Socratic dialogue</p>
	</header>

	<div class="config-bar">
		<div class="config-field">
			<label for="baseUrl">Base URL</label>
			<input id="baseUrl" type="text" bind:value={baseUrl} />
		</div>
		<div class="config-field">
			<label for="assignmentId">Assignment ID</label>
			<input id="assignmentId" type="text" bind:value={assignmentId} placeholder="assignment_xyz" />
		</div>
		<div class="config-field auth-field">
			<label for="authToken">Bearer Token</label>
			<input
				id="authToken"
				type="password"
				bind:value={authToken}
				placeholder="Firebase ID token"
			/>
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
				{#each sampleMessages as message}
					<button class="sample-btn" onclick={() => loadSampleMessage(message)}>
						"{message.substring(0, 40)}..."
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

	.config-field label {
		font-size: 0.75rem;
		color: #64748b;
	}

	.config-field input {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 4px;
		padding: 0.5rem 0.75rem;
		color: #e2e8f0;
		font-size: 0.875rem;
		width: 200px;
	}

	.auth-field input {
		width: 300px;
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
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		color: #64748b;
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.sample-btn:hover {
		border-color: #3b82f6;
		color: #3b82f6;
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
