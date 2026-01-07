<script lang="ts">
	import { resolve } from '$app/paths';
	import { apiModules } from '$lib/explorer/api-spec';

	const totalMethods = apiModules.reduce((acc, m) => acc + m.methods.length, 0);
	const directMethods = apiModules.reduce(
		(acc, m) => acc + m.methods.filter((method) => method.accessType === 'direct').length,
		0
	);
	const delegatedMethods = totalMethods - directMethods;
</script>

<div class="home">
	<header class="hero">
		<h1>🎓 Mentora API Explorer</h1>
		<p class="subtitle">Interactive documentation and testing tools for the Mentora SDK</p>
	</header>

	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-value">{apiModules.length}</div>
			<div class="stat-label">Modules</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{totalMethods}</div>
			<div class="stat-label">Methods</div>
		</div>
		<div class="stat-card">
			<div class="stat-value" style="color: #22c55e">{directMethods}</div>
			<div class="stat-label">🔥 Direct Access</div>
		</div>
		<div class="stat-card">
			<div class="stat-value" style="color: #3b82f6">{delegatedMethods}</div>
			<div class="stat-label">🌐 Delegated</div>
		</div>
	</div>

	<section class="features">
		<h2>Available Tools</h2>
		<div class="features-grid">
			<a href={resolve('/docs')} class="feature-card">
				<div class="feature-icon">📖</div>
				<h3>SDK Documentation</h3>
				<p>Complete reference for all MentoraClient methods with signatures and examples</p>
			</a>

			<a href={resolve('/tester')} class="feature-card">
				<div class="feature-icon">🧪</div>
				<h3>API Reference</h3>
				<p>Interactive SDK method browser with parameters, return types, and code examples</p>
			</a>
		</div>
	</section>

	<section class="overview">
		<h2>SDK Modules</h2>
		<div class="tags-grid">
			{#each apiModules as module (module.name)}
				<div class="tag-card" style="border-left-color: {module.color}">
					<h3><span class="module-icon">{module.icon}</span> {module.name}</h3>
					<p>{module.description}</p>
					<div class="tag-count">{module.methods.length} methods</div>
				</div>
			{/each}
		</div>
	</section>
</div>

<style>
	.home {
		max-width: 1200px;
		margin: 0 auto;
	}

	.hero {
		text-align: center;
		padding: 3rem 0;
		border-bottom: 1px solid #334155;
		margin-bottom: 2rem;
	}

	.hero h1 {
		font-size: 2.5rem;
		margin: 0 0 1rem;
		color: #f8fafc;
	}

	.subtitle {
		font-size: 1.125rem;
		color: #94a3b8;
		margin: 0;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-bottom: 3rem;
	}

	.stat-card {
		background: #1e293b;
		border-radius: 12px;
		padding: 1.5rem;
		text-align: center;
		border: 1px solid #334155;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: #3b82f6;
		margin-bottom: 0.5rem;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #94a3b8;
	}

	.features h2,
	.overview h2 {
		font-size: 1.5rem;
		color: #f8fafc;
		margin-bottom: 1.5rem;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
		margin-bottom: 3rem;
	}

	.feature-card {
		background: #1e293b;
		border-radius: 12px;
		padding: 2rem;
		border: 1px solid #334155;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.feature-card:hover {
		border-color: #3b82f6;
		transform: translateY(-2px);
	}

	.feature-icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}

	.feature-card h3 {
		font-size: 1.25rem;
		color: #f8fafc;
		margin: 0 0 0.75rem;
	}

	.feature-card p {
		color: #94a3b8;
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.tags-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.tag-card {
		background: #1e293b;
		border-radius: 8px;
		padding: 1.25rem;
		border: 1px solid #334155;
		border-left-width: 4px;
	}

	.tag-card h3 {
		font-size: 1.125rem;
		color: #f8fafc;
		margin: 0 0 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.module-icon {
		font-size: 1.25rem;
	}

	.tag-card p {
		color: #94a3b8;
		margin: 0 0 0.75rem;
		font-size: 0.875rem;
	}

	.tag-count {
		font-size: 0.75rem;
		color: #64748b;
	}

	@media (max-width: 900px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.features-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
