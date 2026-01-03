<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { resolve } from "$app/paths";
    import { api } from "$lib";
    import { Spinner } from "flowbite-svelte";
    import { fade } from "svelte/transition";
    import {
        ArrowRight,
        Sparkles,
        BrainCircuit,
        ShieldCheck,
        Zap,
        Github,
        FileText,
        Globe,
        Rocket,
        Lock,
    } from "@lucide/svelte";

    import PageHead from "$lib/components/PageHead.svelte";
    import BaseLayout from "$lib/components/layout/BaseLayout.svelte";
    import GlassCard from "$lib/components/ui/GlassCard.svelte";
    import MetricStat from "$lib/components/ui/MetricStat.svelte";
    import CosmicButton from "$lib/components/ui/CosmicButton.svelte";
    import DataGrid from "$lib/components/ui/DataGrid.svelte";

    // --- Dashboard State (Existing) ---

    const stats = [
        { label: "Active Courses", value: "3" },
        { label: "Pending Tasks", value: "5" },
        { label: "Avg. Score", value: "92%" },
        { label: "Hours Learned", value: "128" },
    ];

    const urgentTasks = [
        {
            id: 1,
            title: "Ethics of AI - Final Argument",
            due: "Today, 11:59 PM",
            course: "Philosophy 101",
        },
        {
            id: 2,
            title: "Peer Review: Data Privacy",
            due: "Tomorrow",
            course: "Computer Science",
        },
    ];

    const recentActivity = [
        {
            id: 1,
            title: "Submitted 'Consciousness' Essay",
            type: "Submission",
            time: "2 hours ago",
            status: { label: "Submitted", color: "success" },
        },
        {
            id: 2,
            title: "New feedback from Mentor",
            type: "Feedback",
            time: "5 hours ago",
            status: { label: "New", color: "active" },
        },
        {
            id: 3,
            title: "Started 'Neural Networks' module",
            type: "Course",
            time: "1 day ago",
            status: { label: "In Progress", color: "warning" },
        },
    ];

    let user = $derived(api.currentUser);
    let authReady = $derived(api.authReady);
</script>

<PageHead
    title={user
        ? m.page_home_title()
        : "Mentora - The AI Companion for Dialectic Learning"}
    description={m.page_home_description()}
/>

<BaseLayout>
    {#await authReady}
        <div class="flex h-[calc(100vh-100px)] items-center justify-center">
            <Spinner size="12" color="gray" />
        </div>
    {:then}
        {#if user}
            <!-- LOGGED IN: DASHBOARD VIEW -->
            <div class="container mx-auto max-w-7xl px-4 py-8" in:fade>
                <!-- Welcome Section -->
                <div class="mb-12">
                    <div
                        class="text-text-secondary mb-2 text-sm font-medium tracking-wide uppercase"
                    >
                        {m.home_welcome()}
                    </div>
                    <h1 class="mb-4 font-serif text-5xl text-white">
                        Hello, <span
                            class="bg-brand-gold/20 text-brand-gold px-2 italic"
                            >{user.displayName || "Student"}</span
                        >
                    </h1>
                    <p class="text-text-secondary max-w-2xl text-lg">
                        You have <span class="font-bold text-white"
                            >2 assignments</span
                        > due soon. Your dialectic skills are improving.
                    </p>
                </div>

                <!-- Metrics Grid -->
                <div class="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                    {#each stats as stat (stat.label)}
                        <MetricStat label={stat.label} value={stat.value} />
                    {/each}
                </div>

                <div class="grid gap-8 lg:grid-cols-3">
                    <!-- Main Column: Urgent Tasks & Activity -->
                    <div class="space-y-8 lg:col-span-2">
                        <!-- Urgent Tasks -->
                        <GlassCard>
                            <h2
                                class="mb-6 flex items-center gap-3 font-serif text-2xl text-white"
                            >
                                <span class="bg-brand-gold h-8 w-2 rounded-full"
                                ></span>
                                Priority Attention
                            </h2>
                            <div class="space-y-4">
                                {#each urgentTasks as task (task.id)}
                                    <div
                                        class="group hover:border-brand-gold/30 flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10"
                                    >
                                        <div>
                                            <div
                                                class="text-brand-gold mb-1 font-mono text-xs"
                                            >
                                                {task.course}
                                            </div>
                                            <h3
                                                class="text-lg font-medium text-white"
                                            >
                                                {task.title}
                                            </h3>
                                            <div
                                                class="text-text-secondary mt-1 flex items-center gap-2 text-sm"
                                            >
                                                <div
                                                    class="bg-status-error h-1.5 w-1.5 animate-pulse rounded-full"
                                                ></div>
                                                Due: {task.due}
                                            </div>
                                        </div>
                                        <div
                                            class="translate-x-4 transform opacity-0 transition-opacity group-hover:translate-x-0 group-hover:opacity-100"
                                        >
                                            <CosmicButton
                                                href="/assignments"
                                                variant="secondary"
                                                className="rounded-full! w-10! h-10! p-0! flex items-center justify-center"
                                            >
                                                <ArrowRight class="h-4 w-4" />
                                            </CosmicButton>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </GlassCard>

                        <!-- Recent Activity -->
                        <DataGrid
                            headers={["Activity", "Type", "Status"]}
                            data={recentActivity}
                            renderCell={(item, key) => {
                                if (key === "Activity")
                                    return `<div><div class="text-white font-medium">${item.title}</div><div class="text-xs text-text-secondary">${item.time}</div></div>`;
                                if (key === "Type")
                                    return `<span class="text-sm text-text-secondary">${item.type}</span>`;
                                if (key === "Status")
                                    return `<span class="px-2 py-1 rounded text-xs font-bold bg-${item.status.color === "active" ? "blue" : item.status.color === "success" ? "green" : "yellow"}-500/10 text-${item.status.color === "active" ? "blue" : item.status.color === "success" ? "green" : "yellow"}-500 border border-${item.status.color === "active" ? "blue" : item.status.color === "success" ? "green" : "yellow"}-500/20">${item.status.label}</span>`;
                                return "";
                            }}
                        />
                    </div>

                    <!-- Side Column: AI Mentor Status -->
                    <div class="lg:col-span-1">
                        <GlassCard
                            className="relative overflow-hidden h-full min-h-[400px] flex flex-col items-center text-center p-8 bg-linear-to-b from-brand-gold/10 to-transparent"
                        >
                            <div
                                class="via-brand-gold/50 absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent"
                            ></div>

                            <div class="relative mb-6 h-32 w-32">
                                <div
                                    class="bg-brand-gold/20 absolute inset-0 animate-pulse rounded-full blur-xl"
                                ></div>
                                <div
                                    class="border-brand-gold/30 relative flex h-full w-full items-center justify-center rounded-full border bg-black/20 backdrop-blur-md"
                                >
                                    <Sparkles
                                        class="text-brand-gold h-12 w-12"
                                    />
                                </div>
                            </div>

                            <h3 class="mb-2 font-serif text-2xl text-white">
                                Mentor AI
                            </h3>
                            <div
                                class="bg-status-success/10 border-status-success/20 text-status-success mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold tracking-wider uppercase"
                            >
                                <div
                                    class="bg-status-success h-2 w-2 animate-pulse rounded-full"
                                ></div>
                                Online
                            </div>

                            <p
                                class="text-text-secondary mb-8 text-sm leading-relaxed"
                            >
                                "I've analyzed your latest argument on <span
                                    class="text-white">Data Privacy</span
                                >. Your counter-points are strong, but consider
                                addressing the utilitarian perspective more
                                directly."
                            </p>

                            <div class="mt-auto w-full">
                                <CosmicButton
                                    href="/conversations"
                                    variant="primary"
                                    className="w-full justify-center"
                                >
                                    Resume Session
                                </CosmicButton>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        {:else}
            <!-- LOGGED OUT: LANDING PAGE -->
            <div class="relative w-full overflow-hidden" in:fade>
                <!-- Hero Section -->
                <section
                    class="relative flex min-h-[90vh] w-full flex-col items-center justify-center px-4 py-20 text-center"
                >
                    <!-- Background Effects -->
                    <div
                        class="bg-brand-gold/5 absolute top-1/2 left-1/2 z-0 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full blur-[100px]"
                    ></div>

                    <div class="relative z-10 mx-auto max-w-4xl space-y-8">
                        <div
                            class="text-brand-gold inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium tracking-wide"
                        >
                            <Rocket class="h-4 w-4" />
                            <span>Revolutionizing Critical Thinking</span>
                        </div>

                        <h1
                            class="font-serif text-6xl leading-tight tracking-tight text-white md:text-8xl"
                        >
                            Master the Art of <br />
                            <span
                                class="from-brand-gold to-brand-gold bg-linear-to-r via-white bg-clip-text text-transparent italic"
                                >Dialectic</span
                            >
                        </h1>

                        <p
                            class="text-text-secondary mx-auto max-w-2xl text-xl leading-relaxed font-light md:text-2xl"
                        >
                            Mentora is the AI-powered companion that challenges
                            your assumptions, refines your arguments, and
                            elevates your thinking through Socratic dialogue.
                        </p>

                        <div
                            class="flex flex-col items-center justify-center gap-4 pt-8 sm:flex-row"
                        >
                            <CosmicButton
                                href="/auth"
                                variant="primary"
                                className="text-lg! px-8! py-4! min-w-[200px] justify-center shadow-[0_0_30px_rgba(234,179,8,0.2)] hover:shadow-[0_0_50px_rgba(234,179,8,0.4)]"
                            >
                                Start Learning
                            </CosmicButton>
                            <CosmicButton
                                href="#features"
                                variant="secondary"
                                className="text-lg! px-8! py-4! min-w-[200px] justify-center backdrop-blur-md"
                            >
                                Explore Features
                            </CosmicButton>
                        </div>
                    </div>
                </section>

                <!-- Features Section -->
                <section
                    id="features"
                    class="relative z-10 w-full border-t border-white/5 bg-black/40 py-24 backdrop-blur-md"
                >
                    <div class="container mx-auto max-w-7xl px-4">
                        <div class="mb-16 text-center">
                            <h2 class="mb-4 font-serif text-4xl text-white">
                                Why Mentora?
                            </h2>
                            <p class="text-text-secondary mx-auto max-w-2xl">
                                Beyond simple quizzes. We assess the depth of
                                your understanding through conversation.
                            </p>
                        </div>

                        <div class="grid gap-8 md:grid-cols-3">
                            <GlassCard
                                className="group hover:-translate-y-2 transition-transform duration-300"
                            >
                                <div
                                    class="from-brand-gold/20 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br to-transparent transition-transform group-hover:scale-110"
                                >
                                    <BrainCircuit
                                        class="text-brand-gold h-8 w-8"
                                    />
                                </div>
                                <h3 class="mb-3 text-xl font-bold text-white">
                                    Socratic AI
                                </h3>
                                <p class="text-text-secondary leading-relaxed">
                                    Our AI doesn't just give answers. It asks
                                    the right questions to guide you to the
                                    truth yourself.
                                </p>
                            </GlassCard>

                            <GlassCard
                                className="group hover:-translate-y-2 transition-transform duration-300"
                            >
                                <div
                                    class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500/20 to-transparent transition-transform group-hover:scale-110"
                                >
                                    <ShieldCheck
                                        class="h-8 w-8 text-blue-400"
                                    />
                                </div>
                                <h3 class="mb-3 text-xl font-bold text-white">
                                    Real-time Analysis
                                </h3>
                                <p class="text-text-secondary leading-relaxed">
                                    Get instant feedback on your argument
                                    strength, logical fallacies, and rhetorical
                                    effectiveness.
                                </p>
                            </GlassCard>

                            <GlassCard
                                className="group hover:-translate-y-2 transition-transform duration-300"
                            >
                                <div
                                    class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-purple-500/20 to-transparent transition-transform group-hover:scale-110"
                                >
                                    <Zap class="h-8 w-8 text-purple-400" />
                                </div>
                                <h3 class="mb-3 text-xl font-bold text-white">
                                    Adaptive Learning
                                </h3>
                                <p class="text-text-secondary leading-relaxed">
                                    The curriculum evolves with you. As you
                                    master concepts, the challenges become more
                                    sophisticated.
                                </p>
                            </GlassCard>
                        </div>
                    </div>
                </section>

                <!-- Footer -->
                <footer
                    class="w-full border-t border-white/5 bg-black/60 py-12 backdrop-blur-xl"
                >
                    <div class="container mx-auto max-w-7xl px-4">
                        <div class="mb-8 grid gap-8 md:grid-cols-4">
                            <div class="md:col-span-2">
                                <div class="mb-4 flex items-center gap-3">
                                    <div
                                        class="from-brand-gold to-brand-silver flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br"
                                    >
                                        <Globe class="h-4 w-4 text-black" />
                                    </div>
                                    <span
                                        class="font-serif text-xl font-bold text-white"
                                        >Mentora</span
                                    >
                                </div>
                                <p class="text-text-secondary max-w-sm text-sm">
                                    Empowering the next generation of thinkers
                                    through AI-driven dialectic practice.
                                </p>
                            </div>

                            <div>
                                <h4 class="mb-4 font-bold text-white">
                                    Product
                                </h4>
                                <ul
                                    class="text-text-secondary space-y-2 text-sm"
                                >
                                    <li>
                                        <a
                                            href="#features"
                                            class="hover:text-brand-gold transition-colors"
                                            >Features</a
                                        >
                                    </li>
                                    <li>
                                        <span
                                            class="hover:text-brand-gold cursor-default transition-colors"
                                            >Pricing</span
                                        >
                                    </li>
                                    <li>
                                        <span
                                            class="hover:text-brand-gold cursor-default transition-colors"
                                            >For Educators</span
                                        >
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h4 class="mb-4 font-bold text-white">Legal</h4>
                                <ul
                                    class="text-text-secondary space-y-2 text-sm"
                                >
                                    <li class="flex items-center gap-2">
                                        <FileText class="h-3 w-3" />
                                        <a
                                            href={resolve("/terms")}
                                            class="hover:text-brand-gold transition-colors"
                                            >Terms of Service</a
                                        >
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <Lock class="h-3 w-3" />
                                        <a
                                            href={resolve("/privacy")}
                                            class="hover:text-brand-gold transition-colors"
                                            >Privacy Policy</a
                                        >
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <Github class="h-3 w-3" />
                                        <a
                                            href="https://github.com/mentora"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="hover:text-brand-gold transition-colors"
                                            >GitHub</a
                                        >
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div
                            class="text-text-secondary border-t border-white/5 pt-8 text-center text-xs"
                        >
                            &copy; 2026 Mentora All rights reserved.
                        </div>
                    </div>
                </footer>
            </div>
        {/if}
    {/await}
</BaseLayout>
