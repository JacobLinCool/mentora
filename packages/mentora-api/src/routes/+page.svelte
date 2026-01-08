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

<div class="max-w-6xl mx-auto">
	<header class="text-center py-12 border-b border-slate-700 mb-8">
		<h1 class="text-4xl m-0 mb-4 text-slate-50">🎓 Mentora API Explorer</h1>
		<p class="text-lg text-slate-400 m-0">
			Interactive documentation and testing tools for the Mentora SDK
		</p>
	</header>

	<div class="grid grid-cols-4 gap-4 mb-12">
		<div class="bg-slate-800 rounded-xl p-6 text-center border border-slate-700">
			<div class="text-3xl font-bold text-blue-500 mb-2">{apiModules.length}</div>
			<div class="text-sm text-slate-400">Modules</div>
		</div>
		<div class="bg-slate-800 rounded-xl p-6 text-center border border-slate-700">
			<div class="text-3xl font-bold text-blue-500 mb-2">{totalMethods}</div>
			<div class="text-sm text-slate-400">Methods</div>
		</div>
		<div class="bg-slate-800 rounded-xl p-6 text-center border border-slate-700">
			<div class="text-3xl font-bold text-green-500 mb-2">{directMethods}</div>
			<div class="text-sm text-slate-400">🔥 Direct Access</div>
		</div>
		<div class="bg-slate-800 rounded-xl p-6 text-center border border-slate-700">
			<div class="text-3xl font-bold text-blue-500 mb-2">{delegatedMethods}</div>
			<div class="text-sm text-slate-400">🌐 Delegated</div>
		</div>
	</div>

	<section class="mb-12">
		<h2 class="text-2xl text-slate-50 mb-6">Available Tools</h2>
		<div class="grid grid-cols-2 gap-6">
			<a
				href={resolve('/docs')}
				class="bg-slate-800 rounded-xl p-8 border border-slate-700 no-underline transition-all duration-200 hover:border-blue-500 hover:-translate-y-0.5"
			>
				<div class="text-4xl mb-4">📖</div>
				<h3 class="text-xl text-slate-50 m-0 mb-3">SDK Documentation</h3>
				<p class="text-slate-400 m-0 text-[0.95rem] leading-6">
					Complete reference for all MentoraClient methods with signatures and examples
				</p>
			</a>

			<a
				href={resolve('/tester')}
				class="bg-slate-800 rounded-xl p-8 border border-slate-700 no-underline transition-all duration-200 hover:border-blue-500 hover:-translate-y-0.5"
			>
				<div class="text-4xl mb-4">🧪</div>
				<h3 class="text-xl text-slate-50 m-0 mb-3">API Reference</h3>
				<p class="text-slate-400 m-0 text-[0.95rem] leading-6">
					Interactive SDK method browser with parameters, return types, and code examples
				</p>
			</a>
		</div>
	</section>

	<section>
		<h2 class="text-2xl text-slate-50 mb-6">SDK Modules</h2>
		<div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
			{#each apiModules as module (module.name)}
				<div
					class="bg-slate-800 rounded-lg p-5 border border-slate-700 border-l-4"
					style="border-left-color: {module.color}"
				>
					<h3 class="text-lg text-slate-50 m-0 mb-2 flex items-center gap-2">
						<span class="text-xl">{module.icon}</span>
						{module.name}
					</h3>
					<p class="text-slate-400 m-0 mb-3 text-sm">{module.description}</p>
					<div class="text-xs text-slate-500">{module.methods.length} methods</div>
				</div>
			{/each}
		</div>
	</section>
</div>

<style>
	@media (max-width: 900px) {
		.grid-cols-4 {
			grid-template-columns: repeat(2, 1fr);
		}

		.grid-cols-2 {
			grid-template-columns: 1fr;
		}
	}
</style>
