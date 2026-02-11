<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { setLocale, getLocale } from "$lib/paraglide/runtime";
    import { resolve } from "$app/paths";
    import { browser } from "$app/environment";
    import { api } from "$lib";
    import { Spinner } from "flowbite-svelte";
    import { fade } from "svelte/transition";
    import {
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
    import CosmicButton from "$lib/components/ui/CosmicButton.svelte";
    import { goto } from "$app/navigation";

    // --- Dashboard State (Existing) ---
    $effect(() => {
        if (api.isAuthenticated) {
            goto(resolve("/dashboard"));
        }
    });

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
            <footer class="w-full snap-start border-t border-white/5 bg-black">
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
                                <li>
                                    <a
                                        href={resolve("/pricing")}
                                        class="transition-colors hover:text-white"
                                        >{m.landing_footer_pricing()}</a
                                    >
                                </li>
                                <li>
                                    <a
                                        href={resolve("/roadmap")}
                                        class="transition-colors hover:text-white"
                                        >{m.landing_footer_roadmap()}</a
                                    >
                                </li>
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
                                        <span>{m.landing_footer_repo()}</span>
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
