<script lang="ts">
    import { MessageSquare } from "@lucide/svelte";

    let { courseTitle = "" } = $props();
</script>

<div class="mb-8">
    <h2 class="font-serif-tc text-3xl font-bold text-black">
        {courseTitle} - Topics
    </h2>
</div>

<div class="flex flex-col items-center justify-center p-12 text-gray-500">
    <MessageSquare size={48} class="mb-4 opacity-50" />
    <p class="text-lg">Topics management coming soon</p>
</div>
