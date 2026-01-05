<script lang="ts">
	import type { Snippet } from 'svelte';
	import AuthBar from '$lib/components/AuthBar.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const navItems = [
		{ href: '/', label: 'Home', icon: '🏠' },
		{ href: '/docs', label: 'API Docs', icon: '📖' },
		{ href: '/tester', label: 'API Tester', icon: '🧪' },
		{ href: '/voice', label: 'Voice Chat', icon: '🎙️' }
	];
</script>

<div class="app">
	<nav class="sidebar">
		<div class="logo">
			<span class="logo-icon">🎓</span>
			<span class="logo-text">Mentora API</span>
		</div>

		<ul class="nav-list">
			{#each navItems as item}
				<li>
					<a href={item.href} class="nav-item">
						<span class="nav-icon">{item.icon}</span>
						<span class="nav-label">{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>

		<div class="nav-footer">
			<div class="version">v0.0.1</div>
		</div>
	</nav>

	<div class="main-area">
		<header class="top-bar">
			<AuthBar />
		</header>
		<main class="content">
			{@render children()}
		</main>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
		background: #0f172a;
		color: #e2e8f0;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.app {
		display: flex;
		min-height: 100vh;
	}

	.sidebar {
		width: 240px;
		background: #1e293b;
		border-right: 1px solid #334155;
		display: flex;
		flex-direction: column;
		position: fixed;
		height: 100vh;
	}

	.logo {
		padding: 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		border-bottom: 1px solid #334155;
	}

	.logo-icon {
		font-size: 1.5rem;
	}

	.logo-text {
		font-size: 1.25rem;
		font-weight: 600;
		color: #f8fafc;
	}

	.nav-list {
		list-style: none;
		padding: 1rem 0;
		margin: 0;
		flex: 1;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		color: #94a3b8;
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.nav-item:hover {
		background: #334155;
		color: #f8fafc;
	}

	.nav-icon {
		font-size: 1.25rem;
	}

	.nav-label {
		font-size: 0.95rem;
	}

	.nav-footer {
		padding: 1rem 1.5rem;
		border-top: 1px solid #334155;
	}

	.version {
		font-size: 0.75rem;
		color: #64748b;
	}

	.content {
		flex: 1;
		padding: 2rem;
		min-height: calc(100vh - 60px);
	}

	.main-area {
		flex: 1;
		margin-left: 240px;
		display: flex;
		flex-direction: column;
	}

	.top-bar {
		padding: 1rem 2rem;
		border-bottom: 1px solid #334155;
		background: #0f172a;
		position: sticky;
		top: 0;
		z-index: 10;
	}
</style>
