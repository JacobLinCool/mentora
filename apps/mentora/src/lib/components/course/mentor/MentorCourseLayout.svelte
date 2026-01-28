<script lang="ts">
    import TopBar from "$lib/components/layout/mentor/TopBar.svelte";
    import MentorSidebar from "$lib/components/course/mentor/MentorSidebar.svelte";

    let { activeTab, onTabChange, children } = $props();
</script>

<div class="flex min-h-screen flex-col bg-[#E5E5E5] font-sans">
    <!-- Top Bar -->

    <TopBar />

    <div class="flex flex-1">
        <!-- Sidebar -->
        <aside
            class="flex w-56 flex-col gap-6 border-r border-transparent bg-[#D4D4D4] p-6"
        >
            <MentorSidebar {activeTab} {onTabChange} />
        </aside>

        <!-- Main Content -->
        <main class="flex-1 p-8">
            {@render children()}
        </main>
    </div>
</div>
