<script lang="ts">
    import { onMount } from "svelte";
    import BaseLayout from "$lib/components/layout/BaseLayout.svelte";
    import GlassCard from "$lib/components/ui/GlassCard.svelte";
    import CosmicButton from "$lib/components/ui/CosmicButton.svelte";
    import {
        BarChart3,
        Users,
        TrendingUp,
        MessageSquare,
        Cloud,
        ArrowRight,
        Download,
        Clock,
    } from "@lucide/svelte";
    import PageHead from "$lib/components/PageHead.svelte";
    import { api } from "$lib/api";

    // State
    let overviewStats = $state([
        { label: "Active Students", value: "-", trend: "-", icon: Users },
        { label: "Completion Rate", value: "-", trend: "-", icon: TrendingUp },
        { label: "Avg. Engagement", value: "-", trend: "-", icon: Clock },
        {
            label: "Total Arguments",
            value: "-",
            trend: "-",
            icon: MessageSquare,
        },
    ]);

    let spectrumData = $state<
        { id: number; initial: number; current: number; name: string }[]
    >([]);
    let wordCloudData = $state<
        { text: string; value: number; sentiment: string }[]
    >([]);

    onMount(async () => {
        if (!api.isAuthenticated) await api.authReady;
        await loadAnalytics();
    });

    async function loadAnalytics() {
        // loading = true; // Unused
        try {
            // Call backend analytics endpoint (to be implemented)
            const res = await api.backend.call<{
                overview: typeof overviewStats;
                spectrum: typeof spectrumData;
                wordCloud: typeof wordCloudData;
            }>("/analytics/dashboard", { method: "GET" });

            if (res.success) {
                overviewStats = res.data.overview;
                spectrumData = res.data.spectrum;
                wordCloudData = res.data.wordCloud;
            } else {
                console.warn("Analytics API unavailable:", res.error);
            }
        } catch (e) {
            console.error("Failed to load analytics", e);
        }
    }

    function getWordColor(sentiment: string) {
        switch (sentiment) {
            case "pro":
                return "text-status-success";
            case "con":
                return "text-status-error";
            default:
                return "text-brand-gold";
        }
    }
</script>

<PageHead
    title="Host Analytics | Mentora"
    description="Course performance and student engagement analytics."
/>

<BaseLayout>
    <div class="container mx-auto max-w-7xl px-4 py-8">
        <div
            class="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"
        >
            <div>
                <div
                    class="text-text-secondary mb-2 text-sm font-medium tracking-wide uppercase"
                >
                    Instructor View
                </div>
                <h1
                    class="flex items-center gap-3 font-serif text-4xl text-white"
                >
                    <BarChart3 class="text-brand-gold h-8 w-8" />
                    Analytics Dashboard
                </h1>
                <p class="text-text-secondary mt-2">
                    Real-time insights into student performance and discourse
                    trends.
                </p>
            </div>

            <CosmicButton
                variant="secondary"
                onclick={() => alert("Export functionality coming soon!")}
            >
                <Download class="mr-2 h-4 w-4" />
                Export Report
            </CosmicButton>
        </div>

        <!-- Metric Cards -->
        <div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {#each overviewStats as stat (stat.label)}
                {@const Icon = stat.icon}
                <GlassCard className="relative overflow-hidden group">
                    <div
                        class="absolute -top-4 -right-4 text-white/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    >
                        <Icon class="h-24 w-24" />
                    </div>
                    <div class="relative z-10">
                        <div
                            class="text-text-secondary mb-2 flex items-center gap-2 text-sm font-medium tracking-wider uppercase"
                        >
                            <Icon class="text-brand-gold h-4 w-4" />
                            {stat.label}
                        </div>
                        <div class="flex items-end gap-3">
                            <div class="font-serif text-4xl text-white">
                                {stat.value}
                            </div>
                            <div
                                class="text-status-success bg-status-success/10 mb-2 rounded px-2 py-0.5 font-mono text-sm"
                            >
                                {stat.trend}
                            </div>
                        </div>
                    </div>
                </GlassCard>
            {/each}
        </div>

        <div class="mb-8 grid gap-8 lg:grid-cols-2">
            <!-- Stance Spectrum -->
            <GlassCard className="h-[500px] flex flex-col">
                <div class="mb-6 flex items-center justify-between">
                    <div>
                        <h3
                            class="flex items-center gap-2 font-serif text-xl text-white"
                        >
                            <TrendingUp class="text-brand-gold h-5 w-5" />
                            Stance Spectrum
                        </h3>
                        <p class="text-text-secondary text-sm">
                            Visualizing student shifts from Initial to Current
                            stance.
                        </p>
                    </div>
                    <div class="flex gap-4 font-mono text-xs">
                        <div class="flex items-center gap-1">
                            <span class="h-2 w-2 rounded-full bg-white/30"
                            ></span> Initial
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="bg-brand-gold h-2 w-2 rounded-full"
                            ></span> Current
                        </div>
                    </div>
                </div>

                <div
                    class="relative flex flex-1 items-center justify-center p-4"
                >
                    <!-- Spectrum Axis -->
                    <div
                        class="from-status-error via-brand-silver to-status-success absolute right-0 left-0 h-1 rounded-full bg-linear-to-r opacity-50"
                    ></div>
                    <div
                        class="text-status-error absolute top-1/2 left-0 mt-4 text-xs font-bold tracking-wider uppercase"
                    >
                        Strong Con
                    </div>
                    <div
                        class="text-status-success absolute top-1/2 right-0 mt-4 text-xs font-bold tracking-wider uppercase"
                    >
                        Strong Pro
                    </div>
                    <div
                        class="text-text-secondary absolute top-1/2 left-1/2 mt-4 -translate-x-1/2 text-xs font-bold tracking-wider uppercase"
                    >
                        Neutral
                    </div>

                    <!-- Data Points -->
                    <div class="absolute inset-0 top-8 bottom-8">
                        {#each spectrumData as point (point.id)}
                            {@const leftInitial =
                                ((point.initial + 10) / 20) * 100}
                            {@const leftCurrent =
                                ((point.current + 10) / 20) * 100}
                            {@const top = Math.random() * 80 + 10}

                            <!-- Initial -->
                            <div
                                class="absolute h-2 w-2 rounded-full bg-white/30 transition-all duration-1000"
                                style="left: {leftInitial}%; top: {top}%;"
                            ></div>

                            <!-- Connector -->
                            <svg
                                class="pointer-events-none absolute inset-0 h-full w-full opacity-20"
                            >
                                <line
                                    x1="{leftInitial}%"
                                    y1="{top + 1}%"
                                    x2="{leftCurrent}%"
                                    y2="{top + 1}%"
                                    stroke="white"
                                    stroke-width="1"
                                />
                            </svg>

                            <!-- Current -->
                            <div
                                class="bg-brand-gold group absolute h-3 w-3 cursor-pointer rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all duration-1000 hover:z-20 hover:scale-150"
                                style="left: {leftCurrent}%; top: {top}%; margin-left: -5px;"
                            >
                                <div
                                    class="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded border border-white/20 bg-black/80 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100"
                                >
                                    {point.name}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </GlassCard>

            <!-- Attributed Word Cloud -->
            <GlassCard className="h-[500px] flex flex-col">
                <div class="mb-6">
                    <h3
                        class="flex items-center gap-2 font-serif text-xl text-white"
                    >
                        <Cloud class="text-brand-gold h-5 w-5" />
                        Key Arguments
                    </h3>
                    <p class="text-text-secondary text-sm">
                        Most frequent concepts discussed in student essays.
                    </p>
                </div>

                <div
                    class="flex flex-1 flex-wrap content-center items-center justify-center gap-4 overflow-hidden p-4"
                >
                    {#each wordCloudData as word (word.text)}
                        {@const size = Math.max(1, word.value / 10)}
                        <span
                            class="cursor-default font-serif opacity-90 transition-transform hover:scale-110 hover:opacity-100 {getWordColor(
                                word.sentiment,
                            )}"
                            style="font-size: {size}rem;"
                        >
                            {word.text}
                        </span>
                    {/each}
                </div>
                <div
                    class="text-text-secondary mt-4 flex justify-center gap-6 border-t border-white/5 pt-4 text-xs"
                >
                    <div class="flex items-center gap-2">
                        <div
                            class="bg-status-success h-2 w-2 rounded-full"
                        ></div>
                        Pro Arguments
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="bg-status-error h-2 w-2 rounded-full"></div>
                        Con Arguments
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="bg-brand-gold h-2 w-2 rounded-full"></div>
                        Neutral Concepts
                    </div>
                </div>
            </GlassCard>
        </div>

        <!-- Recent Submissions Table (Placeholder) -->
        <GlassCard>
            <div class="mb-4 flex items-center justify-between">
                <h3 class="font-serif text-lg text-white">Recent Activity</h3>
                <CosmicButton variant="ghost" className="!text-sm"
                    >View All <ArrowRight class="ml-1 h-4 w-4" /></CosmicButton
                >
            </div>
            <div class="space-y-2">
                {#each [1, 2, 3] as i (i)}
                    <div
                        class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3 transition-colors hover:bg-white/10"
                    >
                        <div class="flex items-center gap-3">
                            <div
                                class="from-brand-gold/20 text-brand-gold flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br to-transparent text-xs font-bold"
                            >
                                S{i}
                            </div>
                            <div>
                                <div class="text-sm font-medium text-white">
                                    Student {i}
                                </div>
                                <div class="text-text-secondary text-xs">
                                    Submitted "Ethics of AI" assignment
                                </div>
                            </div>
                        </div>
                        <div class="text-text-secondary font-mono text-xs">
                            {15 - i} mins ago
                        </div>
                    </div>
                {/each}
            </div>
        </GlassCard>
    </div>
</BaseLayout>
