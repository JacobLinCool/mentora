<script lang="ts">
    import * as m from "$lib/paraglide/messages.js";
    import TopBar from "$lib/components/layout/mentor/TopBar.svelte";
    import MentorSidebar from "$lib/components/course/mentor/MentorSidebar.svelte";
    import {
        LayoutDashboard,
        MessageSquare,
        Users,
        Settings,
    } from "@lucide/svelte";

    let { activeTab, onTabChange, children, courseTitle } = $props();

    const navItems = $derived([
        {
            id: "dashboard",
            label: m.mentor_nav_dashboard(),
            icon: LayoutDashboard,
        },
        { id: "topics", label: m.mentor_nav_topics(), icon: MessageSquare },
        { id: "members", label: m.mentor_nav_members(), icon: Users },
        { id: "settings", label: m.mentor_nav_settings(), icon: Settings },
    ]);

    let currentItem = $derived(navItems.find((i) => i.id === activeTab));
    let subtitle = $derived(currentItem?.label || "");
</script>

<svelte:head>
    <title>{courseTitle} - Mentora</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-[#E5E5E5] font-sans">
    <!-- Top Bar -->

    <TopBar />

    <div class="flex flex-1">
        <!-- Sidebar -->
        <aside
            class="flex w-56 flex-col gap-6 border-r border-transparent bg-[#D4D4D4] p-6"
        >
            <MentorSidebar {activeTab} {onTabChange} items={navItems} />
        </aside>

        <!-- Main Content -->
        <main class="flex-1 p-8">
            <div class="mb-8">
                <h2 class="font-serif-tc text-3xl font-bold text-black">
                    {courseTitle}
                    {#if subtitle}
                        <span class="mx-2 text-gray-500">•</span>
                        <span class="text-gray-500">{subtitle}</span>
                    {/if}
                </h2>
            </div>
            {@render children()}
        </main>
    </div>
</div>
