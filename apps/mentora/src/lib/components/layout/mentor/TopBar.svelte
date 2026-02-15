<script lang="ts">
    import { onMount } from "svelte";
    import { Bell, CircleUser } from "@lucide/svelte";
    import { resolve } from "$app/paths";
    import { api } from "$lib";
    import { m } from "$lib/paraglide/messages";

    const unreadCountState = api.createState<number>();
    const unreadCount = $derived(unreadCountState.value || 0);

    onMount(() => {
        let cancelled = false;

        const subscribe = () => {
            api.announcementsSubscribe.subscribeToUnreadCount(unreadCountState);
        };

        if (api.isAuthenticated) {
            subscribe();
        } else {
            api.authReady.then(() => {
                if (!cancelled && api.isAuthenticated) {
                    subscribe();
                }
            });
        }

        return () => {
            cancelled = true;
            unreadCountState.cleanup();
        };
    });
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
            class="relative cursor-pointer hover:text-gray-200"
            aria-label={m.announcements()}
            href={resolve("/announcements")}
        >
            <Bell size={20} />
            {#if unreadCount > 0}
                <span
                    class="absolute -top-2 -right-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-semibold text-white"
                >
                    {Math.min(unreadCount, 99)}
                </span>
            {/if}
        </a>
        <a
            class="cursor-pointer hover:text-gray-200"
            aria-label={m.user_profile()}
            href={resolve("/settings")}><CircleUser size={24} /></a
        >
    </div>
</div>
