<script lang="ts">
    import { Users } from "@lucide/svelte";

    let { courseTitle = "" } = $props();
</script>

<div class="mb-8">
    <h2 class="font-serif-tc text-3xl font-bold text-black">
        {courseTitle} - Members
    </h2>
</div>

<div class="flex flex-col items-center justify-center p-12 text-gray-500">
    <Users size={48} class="mb-4 opacity-50" />
    <p class="text-lg">Members management coming soon</p>
</div>
