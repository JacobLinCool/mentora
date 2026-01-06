<script lang="ts">
	import {
		apiTags,
		getEndpointsByTag,
		getMethodColor,
		type APIEndpoint
	} from '$lib/explorer/api-spec';

	const endpointsByTag = getEndpointsByTag();

	let expandedEndpoint = $state<string | null>(null);
	let selectedTag = $state<string | null>(null);

	function toggleEndpoint(id: string) {
		expandedEndpoint = expandedEndpoint === id ? null : id;
	}

	function getEndpointId(endpoint: APIEndpoint): string {
		return `${endpoint.method}-${endpoint.path}`;
	}

	function formatPath(path: string): string {
		return path;
	}

	$effect(() => {
		// Default to first tag
		if (!selectedTag && apiTags.length > 0) {
			selectedTag = apiTags[0].name;
		}
	});
</script>

<div class="docs-page">
	<header class="page-header">
		<h1>📖 API Documentation</h1>
		<p>Complete reference for all Mentora API endpoints</p>
	</header>

	<div class="docs-layout">
		<aside class="tags-sidebar">
			<h3>Categories</h3>
			<ul class="tag-list">
				{#each apiTags as tag (tag.name)}
					{@const endpoints = endpointsByTag.get(tag.name) || []}
					<li>
						<button
							class="tag-button"
							class:active={selectedTag === tag.name}
							onclick={() => (selectedTag = tag.name)}
							style="--tag-color: {tag.color}"
						>
							<span class="tag-name">{tag.name}</span>
							<span class="tag-count">{endpoints.length}</span>
						</button>
					</li>
				{/each}
			</ul>
		</aside>

		<main class="endpoints-content">
			{#each apiTags as tag (tag.name)}
				{@const endpoints = endpointsByTag.get(tag.name) || []}
				{#if selectedTag === tag.name}
					<section class="tag-section">
						<div class="tag-header" style="border-color: {tag.color}">
							<h2>{tag.name}</h2>
							<p>{tag.description}</p>
						</div>

						<div class="endpoints-list">
							{#each endpoints as endpoint (getEndpointId(endpoint))}
								{@const id = getEndpointId(endpoint)}
								{@const isExpanded = expandedEndpoint === id}
								<article class="endpoint-card">
									<button class="endpoint-header" onclick={() => toggleEndpoint(id)}>
										<span
											class="method-badge"
											style="background: {getMethodColor(endpoint.method)}"
										>
											{endpoint.method}
										</span>
										<code class="endpoint-path">{formatPath(endpoint.path)}</code>
										<span class="endpoint-summary">{endpoint.summary}</span>
										<span class="expand-icon">{isExpanded ? '▼' : '▶'}</span>
									</button>

									{#if isExpanded}
										<div class="endpoint-details">
											{#if endpoint.description}
												<p class="endpoint-description">{endpoint.description}</p>
											{/if}

											{#if endpoint.pathParams && endpoint.pathParams.length > 0}
												<div class="params-section">
													<h4>Path Parameters</h4>
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
															{#each endpoint.pathParams as param (param.name)}
																<tr>
																	<td><code>{param.name}</code></td>
																	<td>{param.type}</td>
																	<td>{param.required ? '✓' : ''}</td>
																	<td>{param.description}</td>
																</tr>
															{/each}
														</tbody>
													</table>
												</div>
											{/if}

											{#if endpoint.queryParams && endpoint.queryParams.length > 0}
												<div class="params-section">
													<h4>Query Parameters</h4>
													<table class="params-table">
														<thead>
															<tr>
																<th>Name</th>
																<th>Type</th>
																<th>Required</th>
																<th>Description</th>
																<th>Default</th>
															</tr>
														</thead>
														<tbody>
															{#each endpoint.queryParams as param (param.name)}
																<tr>
																	<td><code>{param.name}</code></td>
																	<td>
																		{param.type}
																		{#if param.enum}
																			<br /><small>enum: {param.enum.join(' | ')}</small>
																		{/if}
																	</td>
																	<td>{param.required ? '✓' : ''}</td>
																	<td>{param.description}</td>
																	<td
																		>{param.default !== undefined
																			? JSON.stringify(param.default)
																			: '-'}</td
																	>
																</tr>
															{/each}
														</tbody>
													</table>
												</div>
											{/if}

											{#if endpoint.bodyParams && endpoint.bodyParams.length > 0}
												<div class="params-section">
													<h4>Request Body</h4>
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
															{#each endpoint.bodyParams as param (param.name)}
																<tr>
																	<td><code>{param.name}</code></td>
																	<td>
																		{param.type}
																		{#if param.enum}
																			<br /><small>enum: {param.enum.join(' | ')}</small>
																		{/if}
																	</td>
																	<td>{param.required ? '✓' : ''}</td>
																	<td>{param.description}</td>
																</tr>
															{/each}
														</tbody>
													</table>
												</div>
											{/if}

											{#if endpoint.bodyExample}
												<div class="example-section">
													<h4>Request Example</h4>
													<pre class="code-block">{JSON.stringify(
															endpoint.bodyExample,
															null,
															2
														)}</pre>
												</div>
											{/if}

											{#if endpoint.responseExample}
												<div class="example-section">
													<h4>Response Example</h4>
													<pre class="code-block">{JSON.stringify(
															endpoint.responseExample,
															null,
															2
														)}</pre>
												</div>
											{/if}

											<div class="auth-badge">
												{#if endpoint.requiresAuth}
													<span class="auth-required">🔒 Authentication Required</span>
												{:else}
													<span class="auth-public">🌐 Public</span>
												{/if}
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
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		min-width: 60px;
		text-align: center;
	}

	.endpoint-path {
		font-family: 'SF Mono', Monaco, monospace;
		font-size: 0.875rem;
		color: #f8fafc;
	}

	:global(.path-param) {
		color: #f59e0b;
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

	.endpoint-description {
		color: #94a3b8;
		margin: 0 0 1.5rem;
	}

	.params-section {
		margin-bottom: 1.5rem;
	}

	.params-section h4 {
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

	.params-table small {
		color: #64748b;
	}

	.example-section {
		margin-bottom: 1rem;
	}

	.example-section h4 {
		font-size: 0.875rem;
		color: #f8fafc;
		margin: 0 0 0.5rem;
	}

	.code-block {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 6px;
		padding: 1rem;
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
	}

	.auth-required {
		color: #f59e0b;
		font-size: 0.875rem;
	}

	.auth-public {
		color: #22c55e;
		font-size: 0.875rem;
	}
</style>
