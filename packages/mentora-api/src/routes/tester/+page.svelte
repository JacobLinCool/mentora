<script lang="ts">
	import {
		apiEndpoints,
		apiTags,
		getEndpointsByTag,
		getMethodColor,
		type APIEndpoint,
		type APIParameter
	} from '$lib/explorer/api-spec';
	import { subscribeToAuth, type AuthState } from '$lib/explorer/firebase';
	import { sampleCourses, sampleTopics, sampleAssignments } from '$lib/explorer/test-fixtures';
	import { onMount, onDestroy } from 'svelte';

	const endpointsByTag = getEndpointsByTag();

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
	let selectedEndpoint = $state<APIEndpoint | null>(null);
	let baseUrl = $state('http://localhost:5173');

	// Request state
	let pathParams = $state<Record<string, string>>({});
	let queryParams = $state<Record<string, string>>({});
	let bodyJson = $state('');

	// Response state
	let isLoading = $state(false);
	let response = $state<{ status: number; statusText: string; data: unknown; time: number } | null>(
		null
	);
	let error = $state<string | null>(null);

	// Preset ID mappings for quick fill
	const presetIds: Record<string, { value: string; label: string }[]> = {
		courseId: sampleCourses.map((c) => ({ value: c.id, label: c.name })),
		topicId: sampleTopics.map((t) => ({ value: t.id, label: t.name })),
		assignmentId: sampleAssignments.map((a) => ({ value: a.id, label: a.name })),
		id: [
			...sampleCourses.map((c) => ({ value: c.id, label: `Course: ${c.name}` })),
			...sampleTopics.map((t) => ({ value: t.id, label: `Topic: ${t.name}` })),
			...sampleAssignments.map((a) => ({ value: a.id, label: `Assignment: ${a.name}` }))
		]
	};

	function selectEndpoint(endpoint: APIEndpoint) {
		selectedEndpoint = endpoint;
		pathParams = {};
		queryParams = {};
		bodyJson = endpoint.bodyExample ? JSON.stringify(endpoint.bodyExample, null, 2) : '';
		response = null;
		error = null;

		// Initialize params with defaults or presets
		endpoint.pathParams?.forEach((p: APIParameter) => {
			// Try to use preset if available
			const preset = presetIds[p.name]?.[0];
			pathParams[p.name] = preset?.value || '';
		});
		endpoint.queryParams?.forEach((p: APIParameter) => {
			if (p.default !== undefined) {
				queryParams[p.name] = String(p.default);
			}
		});
	}

	function buildUrl(): string {
		if (!selectedEndpoint) return '';

		let path = selectedEndpoint.path;

		// Replace path params
		Object.entries(pathParams).forEach(([key, value]) => {
			path = path.replace(`:${key}`, encodeURIComponent(value));
		});

		// Build query string
		const queryEntries = Object.entries(queryParams).filter(([_, v]) => v !== '');
		const queryString =
			queryEntries.length > 0
				? '?' + queryEntries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
				: '';

		return `${baseUrl}${path}${queryString}`;
	}

	async function sendRequest() {
		if (!selectedEndpoint) return;

		isLoading = true;
		response = null;
		error = null;

		const startTime = Date.now();

		try {
			const url = buildUrl();
			const headers: Record<string, string> = {
				'Content-Type': 'application/json'
			};

			// Use token from auth state (Google Sign-in)
			if (authState.token) {
				headers['Authorization'] = `Bearer ${authState.token}`;
			}

			const options: RequestInit = {
				method: selectedEndpoint.method,
				headers
			};

			if (['POST', 'PATCH', 'PUT'].includes(selectedEndpoint.method) && bodyJson.trim()) {
				options.body = bodyJson;
			}

			const res = await fetch(url, options);
			const time = Date.now() - startTime;

			let data;
			const contentType = res.headers.get('content-type');
			if (contentType?.includes('application/json')) {
				data = await res.json();
			} else {
				data = await res.text();
			}

			response = {
				status: res.status,
				statusText: res.statusText,
				data,
				time
			};
		} catch (err) {
			error = err instanceof Error ? err.message : 'Request failed';
		} finally {
			isLoading = false;
		}
	}

	function getStatusColor(status: number): string {
		if (status < 300) return '#22c55e';
		if (status < 400) return '#3b82f6';
		if (status < 500) return '#f59e0b';
		return '#ef4444';
	}
</script>

<div class="tester-page">
	<header class="page-header">
		<h1>🧪 API Tester</h1>
		<p>
			Test API endpoints with live requests {#if authState.user}<span class="auth-hint"
					>✓ 已登入，Token 會自動帶入</span
				>{:else}<span class="auth-warning">⚠ 請先登入以測試需要認證的 API</span>{/if}
		</p>
	</header>

	<div class="config-bar">
		<div class="config-field">
			<label for="baseUrl">Base URL</label>
			<input id="baseUrl" type="text" bind:value={baseUrl} placeholder="http://localhost:5173" />
		</div>
		<div class="config-field status-field">
			<span class="status-label">認證狀態</span>
			<div class="auth-status-display">
				{#if authState.user}
					<span class="status-indicator success"
						>✓ {authState.user.displayName || authState.user.email}</span
					>
				{:else}
					<span class="status-indicator warning">未登入 - 請使用上方 Google 登入</span>
				{/if}
			</div>
		</div>
	</div>

	<div class="tester-layout">
		<aside class="endpoints-sidebar">
			{#each apiTags as tag}
				{@const endpoints = endpointsByTag.get(tag.name) || []}
				<div class="sidebar-section">
					<h3 style="color: {tag.color}">{tag.name}</h3>
					<ul class="endpoint-list">
						{#each endpoints as endpoint}
							<li>
								<button
									class="endpoint-btn"
									class:active={selectedEndpoint === endpoint}
									onclick={() => selectEndpoint(endpoint)}
								>
									<span class="method-mini" style="background: {getMethodColor(endpoint.method)}">
										{endpoint.method.substring(0, 3)}
									</span>
									<span class="endpoint-path-mini">{endpoint.path}</span>
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</aside>

		<main class="request-panel">
			{#if selectedEndpoint}
				<div class="request-header">
					<span class="method-badge" style="background: {getMethodColor(selectedEndpoint.method)}">
						{selectedEndpoint.method}
					</span>
					<h2>{selectedEndpoint.summary}</h2>
				</div>

				<div class="url-bar">
					<code>{buildUrl()}</code>
					<button class="send-btn" onclick={sendRequest} disabled={isLoading}>
						{isLoading ? 'Sending...' : 'Send'}
					</button>
				</div>

				<div class="params-forms">
					{#if selectedEndpoint.pathParams && selectedEndpoint.pathParams.length > 0}
						<div class="params-form">
							<h3>Path Parameters</h3>
							{#each selectedEndpoint.pathParams as param}
								<div class="form-row">
									<label for="path-{param.name}">
										{param.name}
										{#if param.required}<span class="required">*</span>{/if}
									</label>
									<div class="input-with-presets">
										<input
											id="path-{param.name}"
											type="text"
											bind:value={pathParams[param.name]}
											placeholder={param.description}
										/>
										{#if presetIds[param.name]}
											<select
												class="preset-select"
												onchange={(e) => {
													const target = e.target as HTMLSelectElement;
													if (target.value) pathParams[param.name] = target.value;
												}}
											>
												<option value="">📋 Presets</option>
												{#each presetIds[param.name] as preset}
													<option value={preset.value}>{preset.label}</option>
												{/each}
											</select>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}

					{#if selectedEndpoint.queryParams && selectedEndpoint.queryParams.length > 0}
						<div class="params-form">
							<h3>Query Parameters</h3>
							{#each selectedEndpoint.queryParams as param}
								<div class="form-row">
									<label for="query-{param.name}">
										{param.name}
										{#if param.required}<span class="required">*</span>{/if}
									</label>
									{#if param.enum}
										<select id="query-{param.name}" bind:value={queryParams[param.name]}>
											<option value="">-- Select --</option>
											{#each param.enum as opt}
												<option value={opt}>{opt}</option>
											{/each}
										</select>
									{:else}
										<input
											id="query-{param.name}"
											type={param.type === 'number' ? 'number' : 'text'}
											bind:value={queryParams[param.name]}
											placeholder={param.description}
										/>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					{#if selectedEndpoint.bodyParams && selectedEndpoint.bodyParams.length > 0}
						<div class="params-form body-form">
							<h3>Request Body</h3>
							<textarea bind:value={bodyJson} placeholder={'{ "key": "value" }'} rows="10"
							></textarea>
						</div>
					{/if}
				</div>

				<div class="response-section">
					<h3>Response</h3>
					{#if error}
						<div class="error-box">
							<span class="error-icon">❌</span>
							{error}
						</div>
					{:else if response}
						<div class="response-meta">
							<span class="status-badge" style="background: {getStatusColor(response.status)}">
								{response.status}
								{response.statusText}
							</span>
							<span class="response-time">{response.time}ms</span>
						</div>
						<pre class="response-body">{JSON.stringify(response.data, null, 2)}</pre>
					{:else}
						<div class="empty-response">Click "Send" to make a request</div>
					{/if}
				</div>
			{:else}
				<div class="empty-state">
					<div class="empty-icon">👈</div>
					<h2>Select an endpoint</h2>
					<p>Choose an API endpoint from the sidebar to start testing</p>
				</div>
			{/if}
		</main>
	</div>
</div>

<style>
	.tester-page {
		max-width: 1600px;
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

	.config-field input {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 4px;
		padding: 0.5rem 0.75rem;
		color: #e2e8f0;
		font-family: 'SF Mono', Monaco, monospace;
		font-size: 0.875rem;
		width: 300px;
	}

	.tester-layout {
		display: flex;
		gap: 1.5rem;
	}

	.endpoints-sidebar {
		width: 280px;
		flex-shrink: 0;
		max-height: calc(100vh - 280px);
		overflow-y: auto;
	}

	.sidebar-section {
		margin-bottom: 1.5rem;
	}

	.sidebar-section h3 {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.5rem;
	}

	.endpoint-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.endpoint-btn {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: transparent;
		border: none;
		color: #94a3b8;
		cursor: pointer;
		border-radius: 4px;
		text-align: left;
		font-size: 0.8rem;
	}

	.endpoint-btn:hover {
		background: #1e293b;
	}

	.endpoint-btn.active {
		background: #334155;
		color: #f8fafc;
	}

	.method-mini {
		padding: 0.125rem 0.25rem;
		border-radius: 3px;
		font-size: 0.65rem;
		font-weight: 600;
		color: white;
	}

	.endpoint-path-mini {
		font-family: 'SF Mono', Monaco, monospace;
		font-size: 0.75rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.request-panel {
		flex: 1;
		min-width: 0;
	}

	.request-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.method-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 600;
		color: white;
	}

	.request-header h2 {
		font-size: 1.25rem;
		color: #f8fafc;
		margin: 0;
	}

	.url-bar {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding: 0.75rem 1rem;
		background: #1e293b;
		border-radius: 8px;
		border: 1px solid #334155;
		align-items: center;
	}

	.url-bar code {
		flex: 1;
		font-family: 'SF Mono', Monaco, monospace;
		font-size: 0.875rem;
		color: #22d3ee;
		overflow-x: auto;
	}

	.send-btn {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.5rem 1.5rem;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.send-btn:hover:not(:disabled) {
		background: #2563eb;
	}

	.send-btn:disabled {
		background: #64748b;
		cursor: not-allowed;
	}

	.params-forms {
		display: grid;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.params-form {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 1rem;
	}

	.params-form h3 {
		font-size: 0.875rem;
		color: #f8fafc;
		margin: 0 0 1rem;
	}

	.form-row {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
	}

	.form-row label {
		font-size: 0.75rem;
		color: #94a3b8;
	}

	.required {
		color: #ef4444;
	}

	.form-row input,
	.form-row select {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 4px;
		padding: 0.5rem 0.75rem;
		color: #e2e8f0;
		font-size: 0.875rem;
	}

	.body-form textarea {
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

	.response-section {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 1rem;
	}

	.response-section h3 {
		font-size: 0.875rem;
		color: #f8fafc;
		margin: 0 0 1rem;
	}

	.response-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
	}

	.response-time {
		color: #64748b;
		font-size: 0.875rem;
	}

	.response-body {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 4px;
		padding: 1rem;
		margin: 0;
		overflow-x: auto;
		font-family: 'SF Mono', Monaco, monospace;
		font-size: 0.8rem;
		color: #e2e8f0;
		max-height: 400px;
		overflow-y: auto;
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

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.empty-state h2 {
		font-size: 1.5rem;
		color: #f8fafc;
		margin: 0 0 0.5rem;
	}

	.empty-state p {
		color: #64748b;
		margin: 0;
	}

	.auth-hint {
		color: #22c55e;
		font-size: 0.875rem;
		margin-left: 0.5rem;
	}

	.auth-warning {
		color: #f59e0b;
		font-size: 0.875rem;
		margin-left: 0.5rem;
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

	.input-with-presets {
		display: flex;
		gap: 0.5rem;
	}

	.input-with-presets input {
		flex: 1;
	}

	.preset-select {
		background: #334155;
		border: 1px solid #475569;
		border-radius: 4px;
		padding: 0.5rem;
		color: #e2e8f0;
		font-size: 0.75rem;
		cursor: pointer;
		min-width: 100px;
	}

	.preset-select:hover {
		background: #475569;
	}
</style>
