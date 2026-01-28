<script lang="ts">
    import { MessageSquare } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages.js";
</script>

<div class="flex flex-col items-center justify-center p-12 text-gray-500">
    <MessageSquare size={48} class="mb-4 opacity-50" />
    <p class="text-lg">{m.mentor_topics_coming_soon()}</p>
</div>
