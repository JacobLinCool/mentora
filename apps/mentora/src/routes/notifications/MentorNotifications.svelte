<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import MentorLayout from "$lib/components/layout/mentor/MentorLayout.svelte";
    import {
        Bell,
        CheckCircle2,
        Clock,
        MessageSquare,
        UserPlus,
        AlertCircle,
        ChevronRight,
        Filter,
    } from "@lucide/svelte";

    // Mock data for notifications
    const notifications = [
        {
            id: 1,
            type: "request",
            title: "New Mentorship Request",
            description:
                "Sarah Chen wants to schedule a session regarding 'Advanced React Patterns'.",
            time: "25m ago",
            read: false,
        },
        {
            id: 2,
            type: "message",
            title: "New Message from Alex",
            description: "Hey, I had a question about the assignment...",
            time: "1h ago",
            read: false,
        },
        {
            id: 3,
            type: "system",
            title: "Course Approval",
            description:
                "Your course 'Introduction to SvelteKit' has been approved and is now live!",
            time: "3h ago",
            read: true,
        },
        {
            id: 4,
            type: "alert",
            title: "Session Reminder",
            description:
                "You have a session with Mike coming up in 30 minutes.",
            time: "5h ago",
            read: true,
        },
        {
            id: 5,
            type: "update",
            title: "Platform Update",
            description:
                "We've updated our payout policy. Check it out in your settings.",
            time: "1d ago",
            read: true,
        },
    ];

    function getIcon(type: string) {
        switch (type) {
            case "request":
                return UserPlus;
            case "message":
                return MessageSquare;
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
            case "request":
                return "text-blue-600 bg-blue-50";
            case "message":
                return "text-yellow-600 bg-yellow-50";
            case "system":
                return "text-green-600 bg-green-50";
            case "alert":
                return "text-red-600 bg-red-50";
            default:
                return "text-gray-600 bg-gray-50";
        }
    }
</script>

<MentorLayout>
    <div class="mx-auto max-w-5xl px-8 pt-12 pb-24">
        <div class="mb-12 flex items-center justify-between">
            <div>
                <h1 class="font-serif-tc text-4xl font-bold tracking-tight">
                    {m.notifications_title()}
                </h1>
            </div>
        </div>

        <div class="space-y-8">
            <!-- New Notifications -->
            <div>
                <h2
                    class="mb-4 text-xs font-medium tracking-wider text-gray-600 uppercase"
                >
                    {m.notifications_today()}
                </h2>

                <div class="space-y-3">
                    {#each notifications as notification}
                        <div
                            class="group relative overflow-hidden rounded-xl bg-white p-5 shadow-sm transition-colors hover:bg-[#F5F5F5]"
                        >
                            <div class="flex items-start gap-5">
                                <div
                                    class={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getIconColor(notification.type)}`}
                                >
                                    <svelte:component
                                        this={getIcon(notification.type)}
                                        class="h-5 w-5"
                                    />
                                </div>

                                <div class="min-w-0 flex-1">
                                    <div
                                        class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"
                                    >
                                        <h3
                                            class="text-lg font-medium text-gray-900"
                                        >
                                            {notification.title}
                                        </h3>
                                        <span
                                            class="flex items-center gap-1 text-xs text-gray-500"
                                        >
                                            <Clock class="h-3 w-3" />
                                            {notification.time}
                                        </span>
                                    </div>

                                    <p
                                        class="mt-1 leading-relaxed text-gray-600"
                                    >
                                        {notification.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Earlier -->
            <div>
                <h2
                    class="mb-4 text-xs font-medium tracking-wider text-gray-600 uppercase"
                >
                    {m.notifications_earlier()}
                </h2>
                <div
                    class="rounded-xl bg-white py-12 text-center text-sm text-gray-500 shadow-sm"
                >
                    {m.notifications_empty_earlier()}
                </div>
            </div>
        </div>
    </div>
</MentorLayout>
