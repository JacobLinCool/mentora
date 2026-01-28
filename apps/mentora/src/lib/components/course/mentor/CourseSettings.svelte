<script lang="ts">
    import { Settings } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages.js";

    let { courseTitle = "" } = $props();
</script>

<div class="flex flex-col items-center justify-center p-12 text-gray-500">
    <Settings size={48} class="mb-4 opacity-50" />
    <p class="text-lg">{m.mentor_settings_coming_soon()}</p>
</div>
