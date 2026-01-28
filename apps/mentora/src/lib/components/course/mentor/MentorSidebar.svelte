<script lang="ts">
    import {
        LayoutDashboard,
        MessageSquare,
        Users,
        Settings,
    } from "@lucide/svelte";

    let { activeTab = "dashboard", onTabChange } = $props();

    function handleTabClick(tab: string) {
        if (onTabChange) {
            onTabChange(tab);
        }
    }
</script>

<!-- Navigation Links -->
<nav class="mt-2 flex flex-col gap-2">
    <button
        onclick={() => handleTabClick("dashboard")}
        class="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors {activeTab ===
        'dashboard'
            ? 'bg-[#5A5A5A] text-white'
            : 'text-gray-600 hover:bg-black/5 hover:text-gray-900'}"
    >
        <LayoutDashboard size={20} />
        <span class="font-medium">Dashboard</span>
    </button>
    <button
        onclick={() => handleTabClick("topics")}
        class="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors {activeTab ===
        'topics'
            ? 'bg-[#5A5A5A] text-white'
            : 'text-gray-600 hover:bg-black/5 hover:text-gray-900'}"
    >
        <MessageSquare size={20} />
        <span class="font-medium">Topics</span>
    </button>
    <button
        onclick={() => handleTabClick("members")}
        class="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors {activeTab ===
        'members'
            ? 'bg-[#5A5A5A] text-white'
            : 'text-gray-600 hover:bg-black/5 hover:text-gray-900'}"
    >
        <Users size={20} />
        <span class="font-medium">Members</span>
    </button>
    <button
        onclick={() => handleTabClick("settings")}
        class="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors {activeTab ===
        'settings'
            ? 'bg-[#5A5A5A] text-white'
            : 'text-gray-600 hover:bg-black/5 hover:text-gray-900'}"
    >
        <Settings size={20} />
        <span class="font-medium">Settings</span>
    </button>
</nav>
