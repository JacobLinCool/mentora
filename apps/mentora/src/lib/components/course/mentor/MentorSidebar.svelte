<script lang="ts">
    let { activeTab = "dashboard", onTabChange, items = [] } = $props();

    function handleTabClick(tab: string) {
        if (onTabChange) {
            onTabChange(tab);
        }
    }
</script>

<!-- Navigation Links -->
<nav class="mt-2 flex flex-col gap-2">
    {#each items as item (item.id)}
        <button
            onclick={() => handleTabClick(item.id)}
            class="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors {activeTab ===
            item.id
                ? 'bg-[#5A5A5A] text-white'
                : 'text-gray-600 hover:bg-black/5 hover:text-gray-900'}"
        >
            <item.icon size={20} />
            <span class="font-medium">{item.label}</span>
        </button>
    {/each}
</nav>
