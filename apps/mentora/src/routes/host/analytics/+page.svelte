<script lang="ts">
    import { onMount } from "svelte";
    import BaseLayout from "$lib/components/layout/BaseLayout.svelte";
    import GlassCard from "$lib/components/ui/GlassCard.svelte";
    import CosmicButton from "$lib/components/ui/CosmicButton.svelte";
    import {
        ChartColumn,
        Users,
        TrendingUp,
        MessageSquare,
        Cloud,
        ArrowRight,
        Download,
        Clock,
        Radar,
        BarChart3,
        AlertTriangle,
    } from "@lucide/svelte";
    import PageHead from "$lib/components/PageHead.svelte";
    import { api } from "$lib/api";

    type DashboardResponse = {
        overview: {
            activeStudents: number;
            completionRate: number;
            avgEngagement: number;
            totalArguments: number;
        };
        spectrum: {
            id: number;
            initial: number;
            current: number;
            name: string;
        }[];
        wordCloud: { text: string; value: number; sentiment: string }[];
        assessmentOverview?: {
            avgScores: {
                argumentQuality: number;
                criticalThinking: number;
                principleExtraction: number;
                openness: number;
                coherence: number;
                overall: number;
            };
            scoreDistribution: Array<{ range: string; count: number }>;
            needsAttention: Array<{
                studentName: string;
                courseTitle: string;
                overallScore: number;
                weakestDimension: string;
            }>;
        };
    };

    // State
    let overview = $state<DashboardResponse["overview"]>({
        activeStudents: 0,
        completionRate: 0,
        avgEngagement: 0,
        totalArguments: 0,
    });

    const overviewStats = $derived([
        {
            label: "Active Students",
            value: String(overview.activeStudents),
            trend: "",
            icon: Users,
        },
        {
            label: "Completion Rate",
            value: `${overview.completionRate}%`,
            trend: "",
            icon: TrendingUp,
        },
        {
            label: "Avg. Engagement",
            value: String(overview.avgEngagement),
            trend: "",
            icon: Clock,
        },
        {
            label: "Total Arguments",
            value: String(overview.totalArguments),
            trend: "",
            icon: MessageSquare,
        },
    ]);

    let spectrumData = $state<
        { id: number; initial: number; current: number; name: string }[]
    >([]);
    let wordCloudData = $state<
        { text: string; value: number; sentiment: string }[]
    >([]);
    let assessmentOverview =
        $state<DashboardResponse["assessmentOverview"]>(undefined);

    // Radar chart helpers
    const radarDimensions = [
        { key: "argumentQuality" as const, label: "論證品質" },
        { key: "criticalThinking" as const, label: "批判思考" },
        { key: "principleExtraction" as const, label: "原則提煉" },
        { key: "openness" as const, label: "開放性" },
        { key: "coherence" as const, label: "連貫性" },
    ];

    function polarToCartesian(
        centerX: number,
        centerY: number,
        radius: number,
        angleInDegrees: number,
    ) {
        const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
        return {
            x: centerX + radius * Math.cos(angleInRadians),
            y: centerY + radius * Math.sin(angleInRadians),
        };
    }

    function getRadarPoints(
        scores: DashboardResponse["assessmentOverview"] extends undefined
            ? never
            : NonNullable<DashboardResponse["assessmentOverview"]>["avgScores"],
        cx: number,
        cy: number,
        maxRadius: number,
    ) {
        return radarDimensions.map((dim, i) => {
            const angle = i * 72;
            const value = scores[dim.key];
            const radius = (value / 5) * maxRadius;
            return polarToCartesian(cx, cy, radius, angle);
        });
    }

    const barColors = [
        "from-red-500 to-red-400",
        "from-orange-500 to-yellow-400",
        "from-yellow-400 to-green-400",
        "from-green-500 to-green-400",
    ];

    onMount(async () => {
        if (!api.isAuthenticated) await api.authReady;
        await loadAnalytics();
    });

    async function loadAnalytics() {
        try {
            const res = await api.backend.call<DashboardResponse>(
                "/analytics/dashboard",
                { method: "GET" },
            );

            if (res.success) {
                overview = res.data.overview;
                spectrumData = res.data.spectrum;
                wordCloudData = res.data.wordCloud;
                assessmentOverview = res.data.assessmentOverview;
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
                    <ChartColumn class="text-brand-gold h-8 w-8" />
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
                            {#if stat.trend}
                                <div
                                    class="text-status-success bg-status-success/10 mb-2 rounded px-2 py-0.5 font-mono text-sm"
                                >
                                    {stat.trend}
                                </div>
                            {/if}
                        </div>
                    </div>
                </GlassCard>
            {/each}
        </div>

        <div class="mb-8 grid gap-8 lg:grid-cols-2">
            <!-- Stance Spectrum -->
            <GlassCard className="h-125 flex flex-col">
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
            <GlassCard className="h-125 flex flex-col">
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

        <!-- Assessment Overview: Radar Chart + Score Distribution -->
        <div class="mb-8 grid gap-8 lg:grid-cols-2">
            <!-- Radar Chart -->
            <GlassCard className="flex flex-col">
                <div class="mb-6">
                    <h3
                        class="flex items-center gap-2 font-serif text-xl text-white"
                    >
                        <Radar class="text-brand-gold h-5 w-5" />
                        學習評估概覽
                    </h3>
                    <p class="text-text-secondary text-sm">
                        五維度班級平均分數
                    </p>
                </div>

                {#if assessmentOverview}
                    {@const cx = 150}
                    {@const cy = 150}
                    {@const maxR = 110}
                    {@const scores = assessmentOverview.avgScores}
                    {@const dataPoints = getRadarPoints(scores, cx, cy, maxR)}
                    {@const dataPath =
                        dataPoints
                            .map(
                                (p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`,
                            )
                            .join(" ") + " Z"}

                    <div class="flex flex-1 items-center justify-center p-4">
                        <svg
                            viewBox="0 0 300 300"
                            class="h-full w-full max-w-[300px]"
                        >
                            <!-- Grid rings -->
                            {#each [1, 2, 3, 4, 5] as level}
                                {@const r = (level / 5) * maxR}
                                {@const ringPoints = Array.from(
                                    { length: 5 },
                                    (_, i) =>
                                        polarToCartesian(cx, cy, r, i * 72),
                                )}
                                {@const ringPath =
                                    ringPoints
                                        .map(
                                            (p, i) =>
                                                `${i === 0 ? "M" : "L"}${p.x},${p.y}`,
                                        )
                                        .join(" ") + " Z"}
                                <path
                                    d={ringPath}
                                    fill="none"
                                    stroke="white"
                                    stroke-opacity="0.1"
                                    stroke-width="1"
                                />
                            {/each}

                            <!-- Axis lines -->
                            {#each radarDimensions as _, i}
                                {@const end = polarToCartesian(
                                    cx,
                                    cy,
                                    maxR,
                                    i * 72,
                                )}
                                <line
                                    x1={cx}
                                    y1={cy}
                                    x2={end.x}
                                    y2={end.y}
                                    stroke="white"
                                    stroke-opacity="0.15"
                                    stroke-width="1"
                                />
                            {/each}

                            <!-- Data polygon -->
                            <path
                                d={dataPath}
                                fill="rgba(234, 179, 8, 0.25)"
                                stroke="rgb(234, 179, 8)"
                                stroke-width="2"
                            />

                            <!-- Data points -->
                            {#each dataPoints as point}
                                <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r="4"
                                    fill="rgb(234, 179, 8)"
                                />
                            {/each}

                            <!-- Labels -->
                            {#each radarDimensions as dim, i}
                                {@const labelPos = polarToCartesian(
                                    cx,
                                    cy,
                                    maxR + 24,
                                    i * 72,
                                )}
                                {@const score = scores[dim.key]}
                                <text
                                    x={labelPos.x}
                                    y={labelPos.y}
                                    text-anchor="middle"
                                    dominant-baseline="middle"
                                    fill="white"
                                    font-size="12"
                                    class="font-serif"
                                >
                                    {dim.label}
                                </text>
                                <text
                                    x={labelPos.x}
                                    y={labelPos.y + 14}
                                    text-anchor="middle"
                                    dominant-baseline="middle"
                                    fill="rgb(234, 179, 8)"
                                    font-size="11"
                                    font-weight="bold"
                                >
                                    {score.toFixed(1)}
                                </text>
                            {/each}
                        </svg>
                    </div>
                {:else}
                    <div
                        class="text-text-secondary flex flex-1 items-center justify-center text-sm"
                    >
                        暫無評估數據
                    </div>
                {/if}
            </GlassCard>

            <!-- Score Distribution Bar Chart -->
            <GlassCard className="flex flex-col">
                <div class="mb-6">
                    <h3
                        class="flex items-center gap-2 font-serif text-xl text-white"
                    >
                        <BarChart3 class="text-brand-gold h-5 w-5" />
                        分數分佈
                    </h3>
                    <p class="text-text-secondary text-sm">
                        各分數區間學生人數
                    </p>
                </div>

                {#if assessmentOverview}
                    {@const distribution = assessmentOverview.scoreDistribution}
                    {@const maxCount = Math.max(
                        ...distribution.map((d) => d.count),
                        1,
                    )}

                    <div class="flex flex-1 flex-col justify-center gap-4 px-4">
                        {#each distribution as bucket, i (bucket.range)}
                            <div class="flex items-center gap-3">
                                <span
                                    class="w-10 text-right font-mono text-sm text-white"
                                    >{bucket.range}</span
                                >
                                <div
                                    class="relative h-8 flex-1 overflow-hidden rounded-md bg-white/5"
                                >
                                    <div
                                        class="bg-linear-to-r {barColors[i] ??
                                            barColors[
                                                barColors.length - 1
                                            ]} flex h-full items-center rounded-md transition-all duration-700"
                                        style="width: {(bucket.count /
                                            maxCount) *
                                            100}%;"
                                    >
                                        <span
                                            class="px-2 text-xs font-bold text-white drop-shadow"
                                            >{bucket.count}</span
                                        >
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div
                        class="text-text-secondary flex flex-1 items-center justify-center text-sm"
                    >
                        暫無評估數據
                    </div>
                {/if}
            </GlassCard>
        </div>

        <!-- Needs Attention List -->
        <div class="mb-8">
            <GlassCard>
                <div class="mb-4">
                    <h3
                        class="flex items-center gap-2 font-serif text-xl text-white"
                    >
                        <AlertTriangle class="h-5 w-5 text-amber-400" />
                        需關注學生
                    </h3>
                    <p class="text-text-secondary text-sm">
                        整體評分低於 2.5 的學生
                    </p>
                </div>

                {#if assessmentOverview}
                    {#if assessmentOverview.needsAttention.length > 0}
                        <div class="space-y-2">
                            {#each assessmentOverview.needsAttention as student (student.studentName + student.courseTitle)}
                                <div
                                    class="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 transition-colors hover:bg-amber-500/10"
                                >
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400"
                                        >
                                            <AlertTriangle class="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div
                                                class="text-sm font-medium text-white"
                                            >
                                                {student.studentName}
                                            </div>
                                            <div
                                                class="text-text-secondary text-xs"
                                            >
                                                {student.courseTitle}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-4">
                                        <div class="text-right">
                                            <div
                                                class="font-mono text-sm font-bold text-amber-400"
                                            >
                                                {student.overallScore.toFixed(
                                                    1,
                                                )}
                                            </div>
                                            <div
                                                class="text-text-secondary text-xs"
                                            >
                                                弱項: {student.weakestDimension}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <div
                            class="text-text-secondary py-8 text-center text-sm"
                        >
                            目前沒有需要特別關注的學生
                        </div>
                    {/if}
                {:else}
                    <div class="text-text-secondary py-8 text-center text-sm">
                        暫無評估數據
                    </div>
                {/if}
            </GlassCard>
        </div>

        <!-- Recent Submissions Table (Placeholder) -->
        <GlassCard>
            <div class="mb-4 flex items-center justify-between">
                <h3 class="font-serif text-lg text-white">Recent Activity</h3>
                <CosmicButton variant="ghost" className="text-sm!"
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
