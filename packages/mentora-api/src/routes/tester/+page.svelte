<script lang="ts">
	import {
		apiModules,
		getAccessTypeColor,
		type APIMethod,
		type APIModule
	} from '$lib/explorer/api-spec';
	import { subscribeToAuth, type AuthState } from '$lib/explorer/firebase';
	import { getTranslation, type Language } from '$lib/i18n/tester';
	import { onMount, onDestroy } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';

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

	onMount(() => {
		// Load saved language preference
		const saved = localStorage.getItem('tester-language');
		if (saved === 'en' || saved === 'zh-TW') {
			language = saved;
		}

		unsubscribe = subscribeToAuth((state) => {
			authState = state;
		});
	});

	onDestroy(() => {
		unsubscribe?.();
	});

	function setLanguage(lang: Language) {
		language = lang;
		localStorage.setItem('tester-language', lang);
	}

	// State
	let selectedModule = $state<APIModule | null>(null);
	let selectedMethod = $state<APIMethod | null>(null);
	let expandedModules = new SvelteSet<string>();

	function toggleModule(moduleName: string) {
		if (expandedModules.has(moduleName)) {
			expandedModules.delete(moduleName);
		} else {
			expandedModules.add(moduleName);
		}
	}
	function selectMethod(module: APIModule, method: APIMethod) {
		selectedModule = module;
		selectedMethod = method;
	}
</script>

<div class="max-w-[1600px] mx-auto p-6">
	<header class="mb-6 flex items-start justify-between">
		<div>
			<h1 class="text-3xl font-bold text-slate-50 mb-2">📖 {t.title}</h1>
			<p class="text-slate-400">
				Mentora SDK API Reference
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

	<!-- Auth Status Bar -->
	<div class="flex gap-4 mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
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
		<div class="flex flex-col gap-1">
			<span class="text-xs text-slate-500">Access Types</span>
			<div class="flex gap-2">
				<span
					class="px-2 py-1 rounded text-xs font-medium"
					style="background: {getAccessTypeColor('direct')}20; color: {getAccessTypeColor(
						'direct'
					)}"
				>
					🔥 Direct (Firestore)
				</span>
				<span
					class="px-2 py-1 rounded text-xs font-medium"
					style="background: {getAccessTypeColor('delegated')}20; color: {getAccessTypeColor(
						'delegated'
					)}"
				>
					🌐 Delegated (Backend)
				</span>
			</div>
		</div>
	</div>

	<div class="flex gap-6">
		<!-- Sidebar: Module List -->
		<aside class="w-80 flex-shrink-0 max-h-[calc(100vh-320px)] overflow-y-auto">
			{#each apiModules as module (module.name)}
				<div class="mb-2">
					<button
						onclick={() => toggleModule(module.name)}
						class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors bg-slate-800 hover:bg-slate-700 border border-slate-700"
					>
						<div class="flex items-center gap-2">
							<span class="text-lg">{module.icon}</span>
							<span class="font-medium text-slate-50">{module.name}</span>
							<span class="text-xs text-slate-500">({module.methods.length})</span>
						</div>
						<span class="text-slate-500 text-sm"
							>{expandedModules.has(module.name) ? '▼' : '▶'}</span
						>
					</button>

					{#if expandedModules.has(module.name)}
						<ul class="mt-1 ml-2 space-y-0.5">
							{#each module.methods as method (method.name)}
								<li>
									<button
										onclick={() => selectMethod(module, method)}
										class="w-full flex items-center gap-2 px-3 py-1.5 rounded text-left text-sm transition-colors {selectedMethod ===
										method
											? 'bg-slate-700 text-slate-50'
											: 'text-slate-400 hover:bg-slate-800'}"
									>
										<span
											class="w-2 h-2 rounded-full"
											style="background: {getAccessTypeColor(method.accessType)}"
										></span>
										<span class="font-mono text-xs">{method.name}</span>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		</aside>

		<!-- Main Content -->
		<main class="flex-1 min-w-0">
			{#if selectedMethod && selectedModule}
				<!-- Method Header -->
				<div class="flex items-center gap-4 mb-4">
					<span class="text-2xl">{selectedModule.icon}</span>
					<div>
						<h2 class="text-xl font-medium text-slate-50">{selectedMethod.summary}</h2>
						<span class="text-sm text-slate-500">{selectedModule.name}.{selectedMethod.name}</span>
					</div>
					<span
						class="px-2 py-1 rounded text-xs font-medium ml-auto"
						style="background: {getAccessTypeColor(
							selectedMethod.accessType
						)}20; color: {getAccessTypeColor(selectedMethod.accessType)}"
					>
						{selectedMethod.accessType === 'direct' ? '🔥 Direct' : '🌐 Delegated'}
					</span>
				</div>

				<!-- Signature -->
				<div class="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
					<h3 class="text-xs uppercase tracking-wider text-slate-500 mb-2">Signature</h3>
					<code class="text-cyan-400 font-mono text-sm">
						client.{selectedMethod.signature}
					</code>
				</div>

				<!-- Description -->
				{#if selectedMethod.description}
					<div class="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
						<h3 class="text-xs uppercase tracking-wider text-slate-500 mb-2">Description</h3>
						<p class="text-slate-300">{selectedMethod.description}</p>
					</div>
				{/if}

				<!-- Parameters -->
				{#if selectedMethod.params.length > 0}
					<div class="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
						<h3 class="text-xs uppercase tracking-wider text-slate-500 mb-3">Parameters</h3>
						<table class="w-full text-sm">
							<thead>
								<tr class="text-left text-slate-500">
									<th class="pb-2 font-medium">Name</th>
									<th class="pb-2 font-medium">Type</th>
									<th class="pb-2 font-medium">Required</th>
									<th class="pb-2 font-medium">Description</th>
								</tr>
							</thead>
							<tbody>
								{#each selectedMethod.params as param (param.name)}
									<tr class="border-t border-slate-700">
										<td class="py-2 font-mono text-cyan-400">{param.name}</td>
										<td class="py-2 font-mono text-amber-400 text-xs">{param.type}</td>
										<td class="py-2">
											{#if param.required}
												<span class="text-red-400">✓</span>
											{:else}
												<span class="text-slate-500">-</span>
											{/if}
										</td>
										<td class="py-2 text-slate-400">
											{param.description}
											{#if param.default !== undefined}
												<span class="text-slate-500">
													(default: {JSON.stringify(param.default)})</span
												>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}

				<!-- Returns -->
				<div class="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
					<h3 class="text-xs uppercase tracking-wider text-slate-500 mb-2">Returns</h3>
					<code class="font-mono text-sm text-green-400">{selectedMethod.returns}</code>
				</div>

				<!-- Example -->
				{#if selectedMethod.example}
					<div class="p-4 bg-slate-800 rounded-lg border border-slate-700">
						<h3 class="text-xs uppercase tracking-wider text-slate-500 mb-3">Example</h3>
						<div class="mb-4">
							<span class="text-xs text-slate-500 block mb-1">Call:</span>
							<pre
								class="bg-slate-900 rounded p-3 font-mono text-xs text-cyan-400 overflow-x-auto">{selectedMethod
									.example.call}</pre>
						</div>
						<div>
							<span class="text-xs text-slate-500 block mb-1">Response:</span>
							<pre
								class="bg-slate-900 rounded p-3 font-mono text-xs text-green-400 overflow-x-auto max-h-48 overflow-y-auto">{JSON.stringify(
									selectedMethod.example.response,
									null,
									2
								)}</pre>
						</div>
					</div>
				{/if}

				<!-- Auth Badge -->
				<div class="mt-6 flex items-center gap-2 text-sm text-slate-500">
					{#if selectedMethod.requiresAuth}
						<span class="px-2 py-1 rounded bg-amber-900/30 text-amber-400 text-xs"
							>🔒 Requires Authentication</span
						>
					{:else}
						<span class="px-2 py-1 rounded bg-green-900/30 text-green-400 text-xs">🌐 Public</span>
					{/if}
				</div>
			{:else}
				<!-- Empty State -->
				<div class="text-center py-16">
					<div class="text-6xl mb-4">👈</div>
					<h2 class="text-2xl font-medium text-slate-50 mb-2">{t.selectEndpoint}</h2>
					<p class="text-slate-500">
						Select a module and method from the sidebar to view documentation
					</p>

					<!-- Quick Stats -->
					<div class="mt-8 grid grid-cols-3 gap-4 max-w-lg mx-auto">
						<div class="p-4 bg-slate-800 rounded-lg border border-slate-700">
							<div class="text-2xl font-bold text-slate-50">{apiModules.length}</div>
							<div class="text-sm text-slate-500">Modules</div>
						</div>
						<div class="p-4 bg-slate-800 rounded-lg border border-slate-700">
							<div class="text-2xl font-bold text-slate-50">
								{apiModules.reduce((acc, m) => acc + m.methods.length, 0)}
							</div>
							<div class="text-sm text-slate-500">Methods</div>
						</div>
						<div class="p-4 bg-slate-800 rounded-lg border border-slate-700">
							<div class="text-2xl font-bold text-green-400">
								{apiModules.reduce(
									(acc, m) =>
										acc + m.methods.filter((method) => method.accessType === 'direct').length,
									0
								)}
							</div>
							<div class="text-sm text-slate-500">Direct Access</div>
						</div>
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>
