<script lang="ts">
    import { Bell, CircleUser } from "@lucide/svelte";
    import { resolve } from "$app/paths";
    import { m } from "$lib/paraglide/messages";
</script>

<div
    class="sticky top-0 z-50 flex items-center justify-between bg-[#494949] px-8 py-4 text-white"
>
    <a
        href={resolve("/dashboard")}
        class="font-serif-tc cursor-pointer text-xl font-bold tracking-wide"
    >
        {m.app_name()}
    </a>
    <div class="flex items-center gap-4">
        <a
            class="cursor-pointer hover:text-gray-200"
            aria-label={m.notifications()}
            href={resolve("/notifications")}><Bell size={20} /></a
        >
        <a
            class="cursor-pointer hover:text-gray-200"
            aria-label={m.user_profile()}
            href={resolve("/settings")}><CircleUser size={24} /></a
        >
    </div>
</div>
