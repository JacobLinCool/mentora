<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { setLocale, getLocale } from "$lib/paraglide/runtime";
    import { resolve } from "$app/paths";
    import { browser } from "$app/environment";
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
        Globe,
        ArrowDown,
    } from "@lucide/svelte";

    import PageHead from "$lib/components/PageHead.svelte";
    import BaseLayout from "$lib/components/layout/BaseLayout.svelte";
    import GlassCard from "$lib/components/ui/GlassCard.svelte";
    import MetricStat from "$lib/components/ui/MetricStat.svelte";
    import CosmicButton from "$lib/components/ui/CosmicButton.svelte";
    import DataGrid from "$lib/components/ui/DataGrid.svelte";
    import { goto } from "$app/navigation";

    // --- Dashboard State (Existing) ---
    $effect(() => {
        if (api.isAuthenticated) {
            goto(resolve("/dashboard"));
        }
    });

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
    let landingScrollEl = $state<HTMLElement | null>(null);
    let heroSectionEl = $state<HTMLElement | null>(null);
    let showTopCta = $state(false);

    $effect(() => {
        if (!browser) return;
        if (!user) {
            const { overflow, height } = document.body.style;
            document.body.style.overflow = "hidden";
            document.body.style.height = "100vh";
            return () => {
                document.body.style.overflow = overflow;
                document.body.style.height = height;
            };
        }
    });

    $effect(() => {
        if (!browser) return;
        if (user) return;
        if (!landingScrollEl || !heroSectionEl) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                showTopCta = !entry.isIntersecting;
            },
            {
                root: landingScrollEl,
                threshold: 0.6,
            },
        );

        observer.observe(heroSectionEl);
        return () => observer.disconnect();
    });
</script>

<PageHead
    title={user ? m.page_home_title() : m.landing_meta_title()}
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
            <div
                class="landing-scroll relative w-full overflow-hidden font-black"
                in:fade
                bind:this={landingScrollEl}
            >
                <!-- Language Switcher -->
                <div class="fixed top-6 right-6 z-50 flex items-center gap-3">
                    <a
                        href={resolve("/auth")}
                        class="cta-float flex items-center justify-center gap-2 rounded-full border border-white/5 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-all duration-200 hover:bg-white/20"
                        class:cta-hidden={!showTopCta}
                    >
                        {m.landing_cta_start()}
                    </a>
                    <button
                        class="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-sm text-white transition-all duration-200 hover:bg-white/10"
                        onclick={() =>
                            setLocale(getLocale() === "en" ? "zh-tw" : "en")}
                    >
                        <span>{getLocale() === "en" ? "繁中" : "English"}</span>
                    </button>
                </div>

                <!-- Hero Section -->
                <section
                    class="relative flex w-full snap-start flex-col items-center justify-center text-center"
                    bind:this={heroSectionEl}
                >
                    <div class="w-full px-4 py-16 md:py-20">
                        <!-- Subtle Background Gradient -->
                        <div
                            class="absolute top-1/2 left-1/2 z-0 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 bg-zinc-800/20 opacity-30 blur-[120px]"
                        ></div>

                        <div class="relative z-10 mx-auto max-w-4xl space-y-8">
                            <div
                                class="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-sm font-light tracking-wider text-zinc-300 uppercase"
                            >
                                <Sparkles class="h-3 w-3" />
                                <span>{m.landing_hero_badge()}</span>
                            </div>

                            <h1
                                class="mb-2 font-serif text-6xl leading-tight tracking-tight text-white md:text-8xl lg:text-9xl"
                            >
                                {m.app_name()}
                            </h1>

                            <p
                                class="mb-8 font-serif text-2xl font-light text-zinc-300 italic md:text-3xl"
                            >
                                {m.landing_hero_subtitle()}
                            </p>

                            <div
                                class="flex flex-col items-center justify-center gap-4 pt-8 sm:flex-row"
                            >
                                <CosmicButton
                                    href="/auth"
                                    variant="primary"
                                    className="!bg-white/10 !text-white !border-none backdrop-blur-md min-w-[180px] justify-center"
                                >
                                    {m.landing_cta_start()}
                                </CosmicButton>
                            </div>
                            <div
                                class="flex flex-col items-center gap-3 pt-6 text-xs tracking-[0.2em] text-zinc-400 uppercase"
                            >
                                <span>{m.landing_scroll_hint()}</span>
                                <a
                                    href="#problem"
                                    aria-label={m.landing_scroll_label()}
                                    class="rounded-full p-2 text-zinc-300 transition-colors hover:text-white"
                                >
                                    <ArrowDown class="h-5 w-5" />
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Problem Section -->
                <section
                    id="problem"
                    class="relative z-10 flex w-full snap-start items-center border-y border-white/5 bg-zinc-950/50"
                >
                    <div
                        class="container mx-auto w-full max-w-5xl px-12 py-16 md:px-10 md:py-20"
                    >
                        <div class="mb-16 text-center">
                            <h2
                                class="mb-6 font-serif text-3xl text-white md:text-4xl"
                            >
                                {m.landing_problem_title()}
                            </h2>
                            <p class="mx-auto max-w-xl text-lg text-zinc-500">
                                {m.landing_problem_description()}
                            </p>
                        </div>

                        <div
                            class="grid items-start gap-12 pl-4 md:grid-cols-2 md:gap-y-16 md:pl-12"
                        >
                            <!-- Safe Practice -->
                            <div class="flex items-center gap-6">
                                <div class="shrink-0 text-white">
                                    <ShieldCheck class="h-8 w-8" />
                                </div>
                                <div>
                                    <h4
                                        class="mb-2 text-lg font-medium text-zinc-200"
                                    >
                                        {m.landing_problem_safe_title()}
                                    </h4>
                                    <p class="leading-relaxed text-zinc-500">
                                        {m.landing_problem_safe_description()}
                                    </p>
                                </div>
                            </div>

                            <!-- Scalable Dialectic -->
                            <div class="flex items-center gap-6">
                                <div class="shrink-0 text-white">
                                    <Globe class="h-8 w-8" />
                                </div>
                                <div>
                                    <h4
                                        class="mb-2 text-lg font-medium text-zinc-200"
                                    >
                                        {m.landing_problem_scalable_title()}
                                    </h4>
                                    <p class="leading-relaxed text-zinc-500">
                                        {m.landing_problem_scalable_description()}
                                    </p>
                                </div>
                            </div>

                            <!-- Structured Depth -->
                            <div class="flex items-center gap-6">
                                <div class="shrink-0 text-white">
                                    <BrainCircuit class="h-8 w-8" />
                                </div>
                                <div>
                                    <h4
                                        class="mb-2 text-lg font-medium text-zinc-200"
                                    >
                                        {m.landing_problem_depth_title()}
                                    </h4>
                                    <p class="leading-relaxed text-zinc-500">
                                        {m.landing_problem_depth_description()}
                                    </p>
                                </div>
                            </div>

                            <!-- Measurable Insight -->
                            <div class="flex items-center gap-6">
                                <div class="shrink-0 text-white">
                                    <Zap class="h-8 w-8" />
                                </div>
                                <div>
                                    <h4
                                        class="mb-2 text-lg font-medium text-zinc-200"
                                    >
                                        {m.landing_problem_insight_title()}
                                    </h4>
                                    <p class="leading-relaxed text-zinc-500">
                                        {m.landing_problem_insight_description()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Features Section -->
                <section
                    id="features"
                    class="relative z-10 flex w-full snap-start items-center border-b border-white/5 bg-black/40 backdrop-blur-md"
                >
                    <div
                        class="container mx-auto w-full max-w-7xl px-6 py-16 md:px-10 md:py-20"
                    >
                        <div class="mb-10 text-center">
                            <h2
                                class="mb-4 font-serif text-3xl text-white md:text-4xl"
                            >
                                {m.landing_loop_title()}
                            </h2>
                            <p class="mx-auto max-w-2xl text-lg text-zinc-400">
                                {m.landing_loop_description()}
                            </p>
                        </div>

                        <div class="grid gap-6 md:grid-cols-3">
                            <!-- Clarify -->
                            <GlassCard
                                className="landing-card group hover:-translate-y-1 transition-transform duration-500 !bg-zinc-200/15 !border-white/10 hover:!border-white/25 p-6!"
                            >
                                <div
                                    class="mb-3 flex items-center gap-3 text-zinc-300"
                                >
                                    <BrainCircuit class="h-6 w-6" />
                                    <h3 class="text-lg font-bold text-white">
                                        {m.landing_loop_clarify_title()}
                                    </h3>
                                </div>
                                <p
                                    class="mb-4 font-serif text-xl text-zinc-300 italic"
                                >
                                    {m.landing_loop_clarify_quote()}
                                </p>
                                <p class="text-sm leading-snug text-zinc-500">
                                    {m.landing_loop_clarify_description()}
                                </p>
                            </GlassCard>

                            <GlassCard
                                className="landing-card group hover:-translate-y-1 transition-transform duration-500 !bg-zinc-200/15 !border-white/10 hover:!border-white/25 p-6!"
                            >
                                <div
                                    class="mb-3 flex items-center gap-3 text-zinc-300"
                                >
                                    <ShieldCheck class="h-6 w-6" />
                                    <h3 class="text-lg font-bold text-white">
                                        {m.landing_loop_challenge_title()}
                                    </h3>
                                </div>
                                <p
                                    class="mb-4 font-serif text-xl text-zinc-300 italic"
                                >
                                    {m.landing_loop_challenge_quote()}
                                </p>
                                <p class="text-sm leading-snug text-zinc-500">
                                    {m.landing_loop_challenge_description()}
                                </p>
                            </GlassCard>

                            <GlassCard
                                className="landing-card group hover:-translate-y-1 transition-transform duration-500 !bg-zinc-200/15 !border-white/10 hover:!border-white/25 p-6!"
                            >
                                <div
                                    class="mb-3 flex items-center gap-3 text-zinc-300"
                                >
                                    <Zap class="h-6 w-6" />
                                    <h3 class="text-lg font-bold text-white">
                                        {m.landing_loop_advocate_title()}
                                    </h3>
                                </div>
                                <p
                                    class="mb-4 font-serif text-xl text-zinc-300 italic"
                                >
                                    {m.landing_loop_advocate_quote()}
                                </p>
                                <p class="text-sm leading-snug text-zinc-500">
                                    {m.landing_loop_advocate_description()}
                                </p>
                            </GlassCard>
                        </div>
                    </div>
                </section>

                <!-- Footer -->
                <footer
                    class="w-full snap-start border-t border-white/5 bg-black"
                >
                    <div class="container mx-auto max-w-7xl px-6 py-6 md:px-10">
                        <div class="mb-8 grid gap-8 md:grid-cols-4">
                            <div class="space-y-4 md:col-span-2">
                                <div class="flex items-center gap-3">
                                    <div
                                        class="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800"
                                    >
                                        <Globe class="h-4 w-4 text-zinc-400" />
                                    </div>
                                    <span
                                        class="font-serif text-xl font-bold tracking-tight text-white"
                                        >{m.app_name()}</span
                                    >
                                </div>
                                <p
                                    class="max-w-sm text-sm leading-relaxed text-zinc-500"
                                >
                                    {m.landing_footer_blurb()}
                                </p>
                            </div>

                            <div>
                                <h4
                                    class="mb-4 text-sm font-bold tracking-wider text-white uppercase"
                                >
                                    {m.landing_footer_project()}
                                </h4>
                                <ul class="space-y-2 text-sm text-zinc-500">
                                    <li>
                                        <a
                                            href="#features"
                                            class="transition-colors hover:text-white"
                                            >{m.landing_footer_methodology()}</a
                                        >
                                    </li>
                                    <!-- eslint-disable svelte/no-navigation-without-resolve -->
                                    <li>
                                        <a
                                            href="/pricing"
                                            class="transition-colors hover:text-white"
                                            >{m.landing_footer_pricing()}</a
                                        >
                                    </li>
                                    <li>
                                        <a
                                            href="/roadmap"
                                            class="transition-colors hover:text-white"
                                            >{m.landing_footer_roadmap()}</a
                                        >
                                    </li>
                                    <!-- eslint-enable svelte/no-navigation-without-resolve -->
                                </ul>
                            </div>

                            <div>
                                <h4
                                    class="mb-4 text-sm font-bold tracking-wider text-white uppercase"
                                >
                                    {m.landing_footer_legal()}
                                </h4>
                                <ul class="space-y-2 text-sm text-zinc-500">
                                    <li class="flex items-center gap-2">
                                        <a
                                            href={resolve("/terms")}
                                            class="transition-colors hover:text-white"
                                            >{m.landing_footer_terms()}</a
                                        >
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <a
                                            href={resolve("/privacy")}
                                            class="transition-colors hover:text-white"
                                            >{m.landing_footer_privacy()}</a
                                        >
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <a
                                            href="https://github.com/JacobLinCool/mentora"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="flex items-center gap-2 transition-colors hover:text-white"
                                        >
                                            <Github class="h-3 w-3" />
                                            <span
                                                >{m.landing_footer_repo()}</span
                                            >
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div
                            class="flex flex-col items-center justify-between gap-4 border-t border-zinc-900 text-xs text-zinc-600 md:flex-row"
                        >
                            <span
                                >{m.landing_footer_copyright({
                                    year: "2026",
                                })}</span
                            >
                            <div class="flex items-center gap-4">
                                <span class="cursor-pointer hover:text-zinc-400"
                                    >{m.landing_footer_transparency()}</span
                                >
                                <span class="cursor-pointer hover:text-zinc-400"
                                    >{m.landing_footer_status()}</span
                                >
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        {/if}
    {/await}
</BaseLayout>

<style>
    .landing-scroll {
        height: 100vh;
        height: 100dvh;
        overflow-y: auto;
        scroll-snap-type: y mandatory;
        scroll-behavior: smooth;
        /* Hide scrollbar for Chrome, Safari and Opera */
        &::-webkit-scrollbar {
            display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        -ms-overflow-style: none; /* IE and Edge */
        scrollbar-width: none; /* Firefox */
    }

    .landing-scroll > section {
        box-sizing: border-box;
        height: 100vh;
        height: 100dvh;
        scroll-snap-align: start;
        scroll-snap-stop: always;
    }

    .landing-scroll > footer {
        box-sizing: border-box;
        height: auto;
        min-height: fit-content;
        scroll-snap-align: end;
        scroll-snap-stop: always;
    }

    .cta-float {
        transform: translateY(0);
        opacity: 1;
        transition:
            transform 240ms ease,
            opacity 240ms ease;
    }

    .cta-hidden {
        transform: translateY(10px);
        opacity: 0;
        pointer-events: none;
    }

    :global(.landing-card) {
        box-shadow: 0 18px 30px rgba(0, 0, 0, 0.22);
    }

    @media (prefers-reduced-motion: reduce) {
        .landing-scroll {
            scroll-behavior: auto;
        }
    }
</style>
