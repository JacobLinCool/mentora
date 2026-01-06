<script lang="ts">
	import {
		apiTags,
		getEndpointsByTag,
		getMethodColor,
		type APIEndpoint,
		type APIParameter
	} from '$lib/explorer/api-spec';
	import { subscribeToAuth, type AuthState } from '$lib/explorer/firebase';
	import { getTranslation, type Language } from '$lib/i18n/tester';
	import { onMount, onDestroy } from 'svelte';

	const endpointsByTag = getEndpointsByTag();

	// Language state
	let language = $state<Language>('en');
	const t = $derived(getTranslation(language));

	// Auth state
	let authState = $state<AuthState>({
		user: null,
		token: null,
		loading: true,
		error: null
	});
	let unsubscribe: (() => void) | null = null;

	// Dynamic preset data (fetched from API)
	let courses = $state<{ id: string; name: string }[]>([]);
	let topics = $state<{ id: string; name: string }[]>([]);
	let assignments = $state<{ id: string; name: string }[]>([]);
	let presetsLoading = $state(false);

	onMount(() => {
		// Load saved language preference
		const saved = localStorage.getItem('tester-language');
		if (saved === 'en' || saved === 'zh-TW') {
			language = saved;
		}

		unsubscribe = subscribeToAuth((state) => {
			authState = state;
			// Fetch presets when user logs in
			if (state.token && !presetsLoading && courses.length === 0) {
				fetchPresets(state.token);
			}
		});
	});

	onDestroy(() => {
		unsubscribe?.();
	});

	async function fetchPresets(token: string) {
		presetsLoading = true;
		try {
			// Fetch courses
			const coursesRes = await fetch(`${baseUrl}/api/courses`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (coursesRes.ok) {
				const data = await coursesRes.json();
				courses = (data.data || data || []).map(
					(c: { id: string; title?: string; name?: string }) => ({
						id: c.id,
						name: c.title || c.name || c.id
					})
				);
			}

			// Fetch assignments (if we have courses, use first one)
			if (courses.length > 0) {
				const assignmentsRes = await fetch(`${baseUrl}/api/courses/${courses[0].id}/assignments`, {
					headers: { Authorization: `Bearer ${token}` }
				});
				if (assignmentsRes.ok) {
					const data = await assignmentsRes.json();
					assignments = (data.data || data || []).map(
						(a: { id: string; title?: string; name?: string }) => ({
							id: a.id,
							name: a.title || a.name || a.id
						})
					);
				}

				// Fetch topics
				const topicsRes = await fetch(`${baseUrl}/api/courses/${courses[0].id}/topics`, {
					headers: { Authorization: `Bearer ${token}` }
				});
				if (topicsRes.ok) {
					const data = await topicsRes.json();
					topics = (data.data || data || []).map(
						(t: { id: string; title?: string; name?: string }) => ({
							id: t.id,
							name: t.title || t.name || t.id
						})
					);
				}
			}
		} catch (err) {
			console.error('Failed to fetch presets:', err);
		} finally {
			presetsLoading = false;
		}
	}

	function setLanguage(lang: Language) {
		language = lang;
		localStorage.setItem('tester-language', lang);
	}

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

	// Dynamic preset ID mappings
	const presetIds = $derived<Record<string, { value: string; label: string }[]>>({
		courseId: courses.map((c) => ({ value: c.id, label: c.name })),
		topicId: topics.map((t) => ({ value: t.id, label: t.name })),
		assignmentId: assignments.map((a) => ({ value: a.id, label: a.name })),
		id: [
			...courses.map((c) => ({ value: c.id, label: `Course: ${c.name}` })),
			...topics.map((t) => ({ value: t.id, label: `Topic: ${t.name}` })),
			...assignments.map((a) => ({ value: a.id, label: `Assignment: ${a.name}` }))
		]
	});

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
		const queryEntries = Object.entries(queryParams).filter(([, v]) => v !== '');
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

<div class="max-w-[1600px] mx-auto p-6">
	<header class="mb-6 flex items-start justify-between">
		<div>
			<h1 class="text-3xl font-bold text-slate-50 mb-2">🧪 {t.title}</h1>
			<p class="text-slate-400">
				{t.subtitle}
				{#if authState.user}
					<span class="text-green-400 text-sm ml-2">✓ {t.authHint}</span>
				{:else}
					<span class="text-amber-400 text-sm ml-2">⚠ {t.authWarning}</span>
				{/if}
			</p>
		</div>
		<div class="flex gap-2">
			<button
				onclick={() => setLanguage('en')}
				class="px-3 py-1.5 rounded text-sm font-medium transition-colors {language === 'en'
					? 'bg-blue-600 text-white'
					: 'bg-slate-700 text-slate-300 hover:bg-slate-600'}"
			>
				English
			</button>
			<button
				onclick={() => setLanguage('zh-TW')}
				class="px-3 py-1.5 rounded text-sm font-medium transition-colors {language === 'zh-TW'
					? 'bg-blue-600 text-white'
					: 'bg-slate-700 text-slate-300 hover:bg-slate-600'}"
			>
				繁體中文
			</button>
		</div>
	</header>

	<div class="flex gap-4 mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
		<div class="flex flex-col gap-1 flex-1">
			<label for="baseUrl" class="text-xs text-slate-500">{t.baseUrl}</label>
			<input
				id="baseUrl"
				type="text"
				bind:value={baseUrl}
				placeholder="http://localhost:5173"
				class="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
		</div>
		<div class="flex flex-col gap-1 flex-1">
			<span class="text-xs text-slate-500">{t.authStatus}</span>
			<div class="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm">
				{#if authState.user}
					<span class="text-green-400">✓ {authState.user.displayName || authState.user.email}</span>
				{:else}
					<span class="text-amber-400">{t.notLoggedIn}</span>
				{/if}
			</div>
		</div>
	</div>

	<div class="flex gap-6">
		<aside class="w-72 flex-shrink-0 max-h-[calc(100vh-320px)] overflow-y-auto">
			{#each apiTags as tag (tag.name)}
				{@const endpoints = endpointsByTag.get(tag.name) || []}
				<div class="mb-6">
					<h3 class="text-xs uppercase tracking-wider mb-2" style="color: {tag.color}">
						{tag.name}
					</h3>
					<ul class="space-y-0.5">
						{#each endpoints as endpoint (`${endpoint.method}:${endpoint.path}`)}
							<li>
								<button
									onclick={() => selectEndpoint(endpoint)}
									class="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors {selectedEndpoint ===
									endpoint
										? 'bg-slate-700 text-slate-50'
										: 'text-slate-400 hover:bg-slate-800'}"
								>
									<span
										class="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
										style="background: {getMethodColor(endpoint.method)}"
									>
										{endpoint.method.substring(0, 3)}
									</span>
									<span class="font-mono text-xs truncate">{endpoint.path}</span>
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</aside>

		<main class="flex-1 min-w-0">
			{#if selectedEndpoint}
				<div class="flex items-center gap-4 mb-4">
					<span
						class="px-3 py-1 rounded text-sm font-semibold text-white"
						style="background: {getMethodColor(selectedEndpoint.method)}"
					>
						{selectedEndpoint.method}
					</span>
					<h2 class="text-xl font-medium text-slate-50">{selectedEndpoint.summary}</h2>
				</div>

				<div
					class="flex items-center gap-4 mb-6 p-3 bg-slate-800 rounded-lg border border-slate-700"
				>
					<code class="flex-1 text-sm text-cyan-400 font-mono overflow-x-auto">{buildUrl()}</code>
					<button
						onclick={sendRequest}
						disabled={isLoading}
						class="px-6 py-2 bg-blue-600 text-white rounded-md font-medium transition-colors hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed"
					>
						{isLoading ? t.sending : t.send}
					</button>
				</div>

				<div class="space-y-6 mb-6">
					{#if selectedEndpoint.pathParams && selectedEndpoint.pathParams.length > 0}
						<div class="bg-slate-800 border border-slate-700 rounded-lg p-4">
							<h3 class="text-sm font-medium text-slate-50 mb-4">{t.pathParams}</h3>
							{#each selectedEndpoint.pathParams as param (param.name)}
								<div class="flex flex-col gap-1 mb-3">
									<label for="path-{param.name}" class="text-xs text-slate-400">
										{param.name}
										{#if param.required}<span class="text-red-400">*</span>{/if}
									</label>
									<div class="flex gap-2">
										<input
											id="path-{param.name}"
											type="text"
											bind:value={pathParams[param.name]}
											placeholder={param.description}
											class="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
										{#if presetIds[param.name] && presetIds[param.name].length > 0}
											<select
												onchange={(e) => {
													const target = e.target as HTMLSelectElement;
													if (target.value) pathParams[param.name] = target.value;
												}}
												class="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-200 text-xs cursor-pointer hover:bg-slate-600 min-w-[100px]"
											>
												<option value=""
													>{presetsLoading ? '⏳ Loading...' : `📋 ${t.presets}`}</option
												>
												{#each presetIds[param.name] as preset (preset.value)}
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
						<div class="bg-slate-800 border border-slate-700 rounded-lg p-4">
							<h3 class="text-sm font-medium text-slate-50 mb-4">{t.queryParams}</h3>
							{#each selectedEndpoint.queryParams as param (param.name)}
								<div class="flex flex-col gap-1 mb-3">
									<label for="query-{param.name}" class="text-xs text-slate-400">
										{param.name}
										{#if param.required}<span class="text-red-400">*</span>{/if}
									</label>
									{#if param.enum}
										<select
											id="query-{param.name}"
											bind:value={queryParams[param.name]}
											class="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
										>
											<option value="">-- Select --</option>
											{#each param.enum as opt (opt)}
												<option value={opt}>{opt}</option>
											{/each}
										</select>
									{:else}
										<input
											id="query-{param.name}"
											type={param.type === 'number' ? 'number' : 'text'}
											bind:value={queryParams[param.name]}
											placeholder={param.description}
											class="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					{#if selectedEndpoint.bodyParams && selectedEndpoint.bodyParams.length > 0}
						<div class="bg-slate-800 border border-slate-700 rounded-lg p-4">
							<h3 class="text-sm font-medium text-slate-50 mb-4">{t.requestBody}</h3>
							<textarea
								bind:value={bodyJson}
								placeholder={'{ "key": "value" }'}
								rows="10"
								class="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono text-xs resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
							></textarea>
						</div>
					{/if}
				</div>

				<div class="bg-slate-800 border border-slate-700 rounded-lg p-4">
					<h3 class="text-sm font-medium text-slate-50 mb-4">{t.response}</h3>
					{#if error}
						<div
							class="flex items-center gap-2 p-4 bg-red-900/20 border border-red-700 rounded text-red-400"
						>
							<span class="text-lg">❌</span>
							{error}
						</div>
					{:else if response}
						<div class="flex items-center gap-4 mb-4">
							<span
								class="px-3 py-1 rounded text-sm font-medium text-white"
								style="background: {getStatusColor(response.status)}"
							>
								{response.status}
								{response.statusText}
							</span>
							<span class="text-slate-500 text-sm">{response.time}ms</span>
						</div>
						<pre
							class="bg-slate-900 border border-slate-700 rounded p-4 overflow-x-auto font-mono text-xs text-slate-200 max-h-96 overflow-y-auto">{JSON.stringify(
								response.data,
								null,
								2
							)}</pre>
					{:else}
						<div class="text-center py-8 text-slate-500">{t.clickToRequest}</div>
					{/if}
				</div>
			{:else}
				<div class="text-center py-16">
					<div class="text-6xl mb-4">👈</div>
					<h2 class="text-2xl font-medium text-slate-50 mb-2">{t.selectEndpoint}</h2>
					<p class="text-slate-500">{t.selectEndpointDesc}</p>
				</div>
			{/if}
		</main>
	</div>
</div>
