<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { Bell, CheckCircle2, AlertCircle, Sparkles } from "@lucide/svelte";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";

    type Notification = {
        id: number;
        type: "grade" | "system" | "alert";
        title: string;
        description: string;
        time: string;
        read: boolean;
        link?: "/courses";
    };

    // Mock data for student notifications
    const notifications: Notification[] = [
        {
            id: 1,
            type: "grade",
            title: "Assignment Graded",
            description: "Your 'React Hooks' assignment has been graded: A",
            time: "2h ago",
            read: false,
            link: "/courses",
        },
        {
            id: 2,
            type: "system",
            title: "New Course Material",
            description: "New lecture notes added to 'Advanced SvelteKit'",
            time: "5h ago",
            read: true,
            link: "/courses",
        },
        {
            id: 3,
            type: "alert",
            title: "Deadline Approaching",
            description: "'Final Project Proposal' is due tomorrow",
            time: "1d ago",
            read: true,
            link: "/courses",
        },
    ];

    function getIcon(type: string) {
        switch (type) {
            case "grade":
                return Sparkles;
            case "system":
                return CheckCircle2;
            case "alert":
                return AlertCircle;
            default:
                return Bell;
        }
    }

    function getIconColor(type: string) {
        switch (type) {
            case "grade":
                return "text-yellow-400";
            case "system":
                return "text-green-400";
            case "alert":
                return "text-red-400";
            default:
                return "text-white/60";
        }
    }
</script>

<div
    class="mb-6 rounded-3xl border border-white/10 bg-[#4C4C4C] p-6 backdrop-blur-md"
>
    <div class="mb-4 flex items-center justify-between">
        <h2
            class="font-serif-tc text-text-secondary text-sm tracking-wide uppercase"
        >
            {m.notifications_title()}
        </h2>
    </div>

    <div class="space-y-4">
        {#each notifications as notification (notification.id)}
            <button
                class="group flex w-full items-start gap-4 text-left transition-opacity hover:opacity-80"
                onclick={() =>
                    notification.link && goto(resolve(notification.link))}
            >
                <div
                    class={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 ${getIconColor(notification.type)}`}
                >
                    <svelte:component
                        this={getIcon(notification.type)}
                        class="h-4 w-4"
                    />
                </div>

                <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-2">
                        <h3 class="text-sm font-medium text-white">
                            {notification.title}
                        </h3>
                        <span class="text-xs text-white/40">
                            {notification.time}
                        </span>
                    </div>
                    <p
                        class="mt-0.5 line-clamp-2 text-xs font-light text-white/60"
                    >
                        {notification.description}
                    </p>
                </div>
            </button>
        {/each}

        {#if notifications.length === 0}
            <div class="py-4 text-center text-sm text-white/30 italic">
                {m.notifications_empty_earlier()}
            </div>
        {/if}
    </div>
</div>
