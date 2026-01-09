<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import AuthBar from '$lib/components/AuthBar.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const navItems = [
		{ href: '/' as const, label: 'Home', icon: '🏠' },
		{ href: '/docs' as const, label: 'API Docs', icon: '📖' },
		{ href: '/tester' as const, label: 'API Tester', icon: '🧪' }
	];
</script>

<div class="flex min-h-screen">
	<nav class="w-60 bg-slate-800 border-r border-slate-700 flex flex-col fixed h-screen">
		<div class="p-6 flex items-center gap-3 border-b border-slate-700">
			<span class="text-2xl">🎓</span>
			<span class="text-xl font-semibold text-slate-50">Mentora API</span>
		</div>

		<ul class="list-none py-4 m-0 flex-1">
			{#each navItems as item (item.href)}
				<li>
					<a
						href={resolve(item.href)}
						class="flex items-center gap-3 px-6 py-3 text-slate-400 no-underline transition-all duration-150 hover:bg-slate-700 hover:text-slate-50"
					>
						<span class="text-xl">{item.icon}</span>
						<span class="text-[0.95rem]">{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>

		<div class="px-6 py-4 border-t border-slate-700">
			<div class="text-xs text-slate-500">v0.0.1</div>
		</div>
	</nav>

	<div class="flex-1 ml-60 flex flex-col">
		<header class="px-8 py-4 border-b border-slate-700 bg-slate-900 sticky top-0 z-10">
			<AuthBar />
		</header>
		<main class="flex-1 p-8 min-h-[calc(100vh-60px)]">
			{@render children()}
		</main>
	</div>
</div>
