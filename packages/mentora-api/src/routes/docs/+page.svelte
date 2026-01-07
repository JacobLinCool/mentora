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

<div class="docs-page">
	<header class="page-header">
		<h1>📖 SDK Documentation</h1>
		<p>Complete reference for all MentoraClient methods</p>
	</header>

	<div class="docs-layout">
		<aside class="tags-sidebar">
			<h3>Modules</h3>
			<ul class="tag-list">
				{#each apiModules as module (module.name)}
					<li>
						<button
							class="tag-button"
							class:active={selectedModule === module.name}
							onclick={() => (selectedModule = module.name)}
							style="--tag-color: {module.color}"
						>
							<span class="tag-name">{module.icon} {module.name}</span>
							<span class="tag-count">{module.methods.length}</span>
						</button>
					</li>
				{/each}
			</ul>
		</aside>

		<main class="endpoints-content">
			{#each apiModules as module (module.name)}
				{#if selectedModule === module.name}
					<section class="tag-section">
						<div class="tag-header" style="border-color: {module.color}">
							<h2>{module.icon} {module.name}</h2>
							<p>{module.description}</p>
						</div>

						<div class="endpoints-list">
							{#each module.methods as method (method.name)}
								{@const id = getMethodId(module, method)}
								{@const isExpanded = expandedMethod === id}
								<article class="endpoint-card">
									<button class="endpoint-header" onclick={() => toggleMethod(id)}>
										<span
											class="method-badge"
											style="background: {getAccessTypeColor(method.accessType)}"
										>
											{method.accessType === 'direct' ? '🔥' : '🌐'}
										</span>
										<code class="endpoint-path">{method.name}</code>
										<span class="endpoint-summary">{method.summary}</span>
										<span class="expand-icon">{isExpanded ? '▼' : '▶'}</span>
									</button>

									{#if isExpanded}
										<div class="endpoint-details">
											<!-- Signature -->
											<div class="signature-section">
												<h4>Signature</h4>
												<pre class="code-block signature-code">client.{method.signature}</pre>
											</div>

											{#if method.description}
												<p class="endpoint-description">{method.description}</p>
											{/if}

											{#if method.params.length > 0}
												<div class="params-section">
													<h4>Parameters</h4>
													<table class="params-table">
														<thead>
															<tr>
																<th>Name</th>
																<th>Type</th>
																<th>Required</th>
																<th>Description</th>
															</tr>
														</thead>
														<tbody>
															{#each method.params as param (param.name)}
																<tr>
																	<td><code>{param.name}</code></td>
																	<td><code class="type-code">{param.type}</code></td>
																	<td>{param.required ? '✓' : ''}</td>
																	<td>
																		{param.description}
																		{#if param.default !== undefined}
																			<span class="default-value"
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
											<div class="returns-section">
												<h4>Returns</h4>
												<code class="return-type">{method.returns}</code>
											</div>

											{#if method.example}
												<div class="example-section">
													<h4>Example</h4>
													<div class="example-call">
														<span class="example-label">Call:</span>
														<pre class="code-block">{method.example.call}</pre>
													</div>
													<div class="example-response">
														<span class="example-label">Response:</span>
														<pre class="code-block">{JSON.stringify(
																method.example.response,
																null,
																2
															)}</pre>
													</div>
												</div>
											{/if}

											<div class="auth-badge">
												{#if method.requiresAuth}
													<span class="auth-required">🔒 Authentication Required</span>
												{:else}
													<span class="auth-public">🌐 Public</span>
												{/if}
												<span
													class="access-type-badge"
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

<style>
	.docs-page {
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 2rem;
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

	.docs-layout {
		display: flex;
		gap: 2rem;
	}

	.tags-sidebar {
		width: 220px;
		flex-shrink: 0;
	}

	.tags-sidebar h3 {
		font-size: 0.875rem;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 1rem;
	}

	.tag-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.tag-button {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		color: #94a3b8;
		cursor: pointer;
		border-radius: 8px;
		margin-bottom: 0.25rem;
		transition: all 0.15s ease;
	}

	.tag-button:hover {
		background: #1e293b;
		color: #f8fafc;
	}

	.tag-button.active {
		background: #1e293b;
		color: #f8fafc;
		border-left: 3px solid var(--tag-color);
	}

	.tag-count {
		background: #334155;
		padding: 0.125rem 0.5rem;
		border-radius: 999px;
		font-size: 0.75rem;
	}

	.endpoints-content {
		flex: 1;
		min-width: 0;
	}

	.tag-header {
		border-left: 4px solid;
		padding-left: 1rem;
		margin-bottom: 1.5rem;
	}

	.tag-header h2 {
		font-size: 1.5rem;
		color: #f8fafc;
		margin: 0 0 0.25rem;
	}

	.tag-header p {
		color: #94a3b8;
		margin: 0;
	}

	.endpoint-card {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 8px;
		margin-bottom: 0.75rem;
		overflow: hidden;
	}

	.endpoint-header {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		text-align: left;
	}

	.endpoint-header:hover {
		background: #334155;
	}

	.method-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.875rem;
		min-width: 32px;
		text-align: center;
	}

	.endpoint-path {
		font-family: 'SF Mono', Monaco, monospace;
		font-size: 0.875rem;
		color: #22d3ee;
	}

	.endpoint-summary {
		flex: 1;
		color: #94a3b8;
		font-size: 0.875rem;
	}

	.expand-icon {
		color: #64748b;
		font-size: 0.75rem;
	}

	.endpoint-details {
		padding: 1rem 1.5rem 1.5rem;
		border-top: 1px solid #334155;
		background: #0f172a;
	}

	.signature-section {
		margin-bottom: 1rem;
	}

	.signature-section h4 {
		font-size: 0.75rem;
		color: #64748b;
		text-transform: uppercase;
		margin: 0 0 0.5rem;
	}

	.signature-code {
		color: #22d3ee;
	}

	.endpoint-description {
		color: #94a3b8;
		margin: 0 0 1.5rem;
	}

	.params-section,
	.returns-section {
		margin-bottom: 1.5rem;
	}

	.params-section h4,
	.returns-section h4 {
		font-size: 0.875rem;
		color: #f8fafc;
		margin: 0 0 0.75rem;
	}

	.params-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.params-table th {
		text-align: left;
		padding: 0.5rem;
		color: #64748b;
		font-weight: 500;
		border-bottom: 1px solid #334155;
	}

	.params-table td {
		padding: 0.5rem;
		color: #e2e8f0;
		border-bottom: 1px solid #334155;
	}

	.params-table code {
		color: #22d3ee;
	}

	.type-code {
		color: #f59e0b !important;
		font-size: 0.75rem;
	}

	.default-value {
		color: #64748b;
		font-size: 0.75rem;
	}

	.return-type {
		color: #22c55e;
		font-family: 'SF Mono', Monaco, monospace;
		font-size: 0.875rem;
	}

	.example-section {
		margin-bottom: 1rem;
	}

	.example-section h4 {
		font-size: 0.875rem;
		color: #f8fafc;
		margin: 0 0 0.75rem;
	}

	.example-label {
		display: block;
		font-size: 0.75rem;
		color: #64748b;
		margin-bottom: 0.25rem;
	}

	.example-call,
	.example-response {
		margin-bottom: 0.75rem;
	}

	.code-block {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 6px;
		padding: 0.75rem 1rem;
		overflow-x: auto;
		font-family: 'SF Mono', Monaco, monospace;
		font-size: 0.8rem;
		color: #e2e8f0;
		margin: 0;
	}

	.auth-badge {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #334155;
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.auth-required {
		color: #f59e0b;
		font-size: 0.875rem;
	}

	.auth-public {
		color: #22c55e;
		font-size: 0.875rem;
	}

	.access-type-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
	}
</style>
