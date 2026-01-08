<script lang="ts">
	import {
		apiModules,
		getAccessTypeColor,
		type APIMethod,
		type APIModule
	} from '$lib/explorer/api-spec';

	let expandedMethod = $state<string | null>(null);
	let selectedModule = $state<string | null>(null);

	function toggleMethod(id: string) {
		expandedMethod = expandedMethod === id ? null : id;
	}

	function getMethodId(module: APIModule, method: APIMethod): string {
		return `${module.name}.${method.name}`;
	}

	$effect(() => {
		// Default to first module
		if (!selectedModule && apiModules.length > 0) {
			selectedModule = apiModules[0].name;
		}
	});
</script>

<div class="max-w-7xl mx-auto">
	<header class="mb-8">
		<h1 class="text-3xl text-slate-50 mb-2">📖 SDK Documentation</h1>
		<p class="text-slate-400 m-0">Complete reference for all MentoraClient methods</p>
	</header>

	<div class="flex gap-8">
		<aside class="w-55 shrink-0">
			<h3 class="text-xs text-slate-500 uppercase tracking-wider mb-4 m-0">Modules</h3>
			<ul class="list-none p-0 m-0">
				{#each apiModules as module (module.name)}
					<li>
						<button
							class="w-full flex justify-between items-center px-4 py-3 bg-transparent border-none text-slate-400 cursor-pointer rounded-lg mb-1 transition-all duration-150 hover:bg-slate-800 hover:text-slate-50 {selectedModule ===
							module.name
								? 'bg-slate-800 text-slate-50 border-l-[3px]'
								: ''}"
							onclick={() => (selectedModule = module.name)}
							style={selectedModule === module.name ? `border-left-color: ${module.color}` : ''}
						>
							<span>{module.icon} {module.name}</span>
							<span class="bg-slate-700 px-2 py-0.5 rounded-full text-xs"
								>{module.methods.length}</span
							>
						</button>
					</li>
				{/each}
			</ul>
		</aside>

		<main class="flex-1 min-w-0">
			{#each apiModules as module (module.name)}
				{#if selectedModule === module.name}
					<section>
						<div class="border-l-4 pl-4 mb-6" style="border-color: {module.color}">
							<h2 class="text-2xl text-slate-50 mb-1 m-0">{module.icon} {module.name}</h2>
							<p class="text-slate-400 m-0">{module.description}</p>
						</div>

						<div>
							{#each module.methods as method (method.name)}
								{@const id = getMethodId(module, method)}
								{@const isExpanded = expandedMethod === id}
								<article
									class="bg-slate-800 border border-slate-700 rounded-lg mb-3 overflow-hidden"
								>
									<button
										class="w-full flex items-center gap-4 p-4 bg-transparent border-none text-inherit cursor-pointer text-left hover:bg-slate-700"
										onclick={() => toggleMethod(id)}
									>
										<span
											class="px-2 py-1 rounded text-sm min-w-8 text-center"
											style="background: {getAccessTypeColor(method.accessType)}"
										>
											{method.accessType === 'direct' ? '🔥' : '🌐'}
										</span>
										<code class="font-mono text-sm text-cyan-400">{method.name}</code>
										<span class="flex-1 text-slate-400 text-sm">{method.summary}</span>
										<span class="text-slate-500 text-xs">{isExpanded ? '▼' : '▶'}</span>
									</button>

									{#if isExpanded}
										<div class="px-6 pb-6 pt-4 border-t border-slate-700 bg-slate-900">
											<!-- Signature -->
											<div class="mb-4">
												<h4 class="text-xs text-slate-500 uppercase m-0 mb-2">Signature</h4>
												<pre
													class="bg-slate-800 border border-slate-700 rounded-md px-4 py-3 overflow-x-auto font-mono text-[0.8rem] text-slate-200 m-0 text-cyan-400">client.{method.signature}</pre>
											</div>

											{#if method.description}
												<p class="text-slate-400 mb-6 mt-0">{method.description}</p>
											{/if}

											{#if method.params.length > 0}
												<div class="mb-6">
													<h4 class="text-sm text-slate-50 mb-3 mt-0">Parameters</h4>
													<table class="w-full border-collapse text-sm">
														<thead>
															<tr>
																<th
																	class="text-left p-2 text-slate-500 font-medium border-b border-slate-700"
																	>Name</th
																>
																<th
																	class="text-left p-2 text-slate-500 font-medium border-b border-slate-700"
																	>Type</th
																>
																<th
																	class="text-left p-2 text-slate-500 font-medium border-b border-slate-700"
																	>Required</th
																>
																<th
																	class="text-left p-2 text-slate-500 font-medium border-b border-slate-700"
																	>Description</th
																>
															</tr>
														</thead>
														<tbody>
															{#each method.params as param (param.name)}
																<tr>
																	<td class="p-2 text-slate-200 border-b border-slate-700"
																		><code class="text-cyan-400">{param.name}</code></td
																	>
																	<td class="p-2 text-slate-200 border-b border-slate-700"
																		><code class="text-amber-500 text-xs">{param.type}</code></td
																	>
																	<td class="p-2 text-slate-200 border-b border-slate-700"
																		>{param.required ? '✓' : ''}</td
																	>
																	<td class="p-2 text-slate-200 border-b border-slate-700">
																		{param.description}
																		{#if param.default !== undefined}
																			<span class="text-slate-500 text-xs"
																				>(default: {JSON.stringify(param.default)})</span
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
											<div class="mb-6">
												<h4 class="text-sm text-slate-50 mb-3 mt-0">Returns</h4>
												<code class="text-green-500 font-mono text-sm">{method.returns}</code>
											</div>

											{#if method.example}
												<div class="mb-4">
													<h4 class="text-sm text-slate-50 mb-3 mt-0">Example</h4>
													<div class="mb-3">
														<span class="block text-xs text-slate-500 mb-1">Call:</span>
														<pre
															class="bg-slate-800 border border-slate-700 rounded-md px-4 py-3 overflow-x-auto font-mono text-[0.8rem] text-slate-200 m-0">{method
																.example.call}</pre>
													</div>
													<div class="mb-3">
														<span class="block text-xs text-slate-500 mb-1">Response:</span>
														<pre
															class="bg-slate-800 border border-slate-700 rounded-md px-4 py-3 overflow-x-auto font-mono text-[0.8rem] text-slate-200 m-0">{JSON.stringify(
																method.example.response,
																null,
																2
															)}</pre>
													</div>
												</div>
											{/if}

											<div class="mt-4 pt-4 border-t border-slate-700 flex gap-4 items-center">
												{#if method.requiresAuth}
													<span class="text-amber-500 text-sm">🔒 Authentication Required</span>
												{:else}
													<span class="text-green-500 text-sm">🌐 Public</span>
												{/if}
												<span
													class="px-2 py-1 rounded text-xs"
													style="background: {getAccessTypeColor(
														method.accessType
													)}20; color: {getAccessTypeColor(method.accessType)}"
												>
													{method.accessType === 'direct' ? '🔥 Direct Access' : '🌐 Delegated'}
												</span>
											</div>
										</div>
									{/if}
								</article>
							{/each}
						</div>
					</section>
				{/if}
			{/each}
		</main>
	</div>
</div>
