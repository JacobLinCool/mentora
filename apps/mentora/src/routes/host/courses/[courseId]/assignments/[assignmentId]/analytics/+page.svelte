<script lang="ts">
    import { onMount } from "svelte";
    import { SvelteSet } from "svelte/reactivity";
    import { page } from "$app/state";
    import { resolve } from "$app/paths";
    import BaseLayout from "$lib/components/layout/BaseLayout.svelte";
    import GlassCard from "$lib/components/ui/GlassCard.svelte";
    import CosmicButton from "$lib/components/ui/CosmicButton.svelte";
    import PageHead from "$lib/components/PageHead.svelte";
    import {
        ArrowLeft,
        ChartColumn,
        ChevronDown,
        ChevronRight,
        Users,
        Calendar,
        BarChart3,
        FileText,
        Eye,
        EyeOff,
        Loader2,
        AlertTriangle,
        ArrowUpDown,
        Quote,
    } from "@lucide/svelte";
    import { api } from "$lib/api";

    type AssignmentAnalytics = {
        title: string;
        dueAt: number | null;
        submittedCount: number;
        totalStudents: number;
        avgScore: number | null;
        spectrum: Array<{ stance: number; name: string }>;
        excerpts: Array<{ text: string; stance: "pro" | "con" }>;
        classReport: {
            content: string;
            generatedAt: number;
            submissionCount: number;
        } | null;
        scores: Array<{
            userId: string;
            name: string;
            overallScore: number;
            dimensions: {
                argumentQuality: number;
                criticalThinking: number;
                principleExtraction: number;
                openness: number;
                coherence: number;
            };
            submittedAt: number | null;
            late: boolean;
            conversationId: string | null;
            stanceHistory: Array<{
                version: number;
                position: string;
                reason: string;
                establishedAt: number;
                confidence?: number;
            }> | null;
            principleHistory: Array<{
                version: number;
                statement: string;
                classification: string | null;
                establishedAt: number;
            }> | null;
            summary: string | null;
        }>;
    };

    let courseId = $derived((page.params as Record<string, string>).courseId);
    let assignmentId = $derived(
        (page.params as Record<string, string>).assignmentId,
    );

    let data = $state<AssignmentAnalytics | null>(null);
    let loading = $state(true);
    let error = $state<string | null>(null);
    let showDetail = $state(false);
    let generating = $state(false);

    // Sorting state for scores table
    let sortKey = $state<string>("overallScore");
    let sortDir = $state<"asc" | "desc">("desc");

    // Seeded random for stable vertical positions
    let spectrumSeeds = $state<number[]>([]);

    let expandedStudents = new SvelteSet<string>();

    function toggleStudentDetail(userId: string) {
        if (expandedStudents.has(userId)) {
            expandedStudents.delete(userId);
        } else {
            expandedStudents.add(userId);
        }
    }

    const scoreHeaders = [
        { key: "name", label: "學生姓名" },
        { key: "overallScore", label: "總分" },
        { key: "argumentQuality", label: "論證品質" },
        { key: "criticalThinking", label: "批判思考" },
        { key: "principleExtraction", label: "原則提煉" },
        { key: "openness", label: "開放性" },
        { key: "coherence", label: "連貫性" },
        { key: "submittedAt", label: "提交時間" },
        { key: "late", label: "遲交" },
    ];

    let sortedScores = $derived(() => {
        if (!data) return [];
        const scores = [...data.scores];
        scores.sort((a, b) => {
            let aVal: number | string | boolean | null;
            let bVal: number | string | boolean | null;

            if (sortKey === "name") {
                aVal = a.name;
                bVal = b.name;
            } else if (sortKey === "overallScore") {
                aVal = a.overallScore;
                bVal = b.overallScore;
            } else if (sortKey === "submittedAt") {
                aVal = a.submittedAt ?? 0;
                bVal = b.submittedAt ?? 0;
            } else if (sortKey === "late") {
                aVal = a.late ? 1 : 0;
                bVal = b.late ? 1 : 0;
            } else {
                aVal = a.dimensions[sortKey as keyof typeof a.dimensions];
                bVal = b.dimensions[sortKey as keyof typeof b.dimensions];
            }

            if (typeof aVal === "string" && typeof bVal === "string") {
                return sortDir === "asc"
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }
            return sortDir === "asc"
                ? (aVal as number) - (bVal as number)
                : (bVal as number) - (aVal as number);
        });
        return scores;
    });

    let proExcerpts = $derived(
        data?.excerpts.filter((e) => e.stance === "pro") ?? [],
    );
    let conExcerpts = $derived(
        data?.excerpts.filter((e) => e.stance === "con") ?? [],
    );

    function toggleSort(key: string) {
        if (sortKey === key) {
            sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
            sortKey = key;
            sortDir = "desc";
        }
    }

    function formatDate(ts: number): string {
        return new Date(ts).toLocaleString("zh-TW");
    }

    function escapeHtml(str: string): string {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function renderMarkdown(md: string): string {
        return escapeHtml(md)
            .replace(
                /### (.+)/g,
                '<h3 class="text-lg font-serif text-white mt-4 mb-2">$1</h3>',
            )
            .replace(
                /## (.+)/g,
                '<h2 class="text-xl font-serif text-white mt-6 mb-3">$1</h2>',
            )
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(
                /^- (.+)$/gm,
                '<li class="ml-4 list-disc text-text-secondary">$1</li>',
            )
            .replace(
                /(<li[^>]*>.*<\/li>\n?)+/g,
                (match) => `<ul class="my-2 space-y-1">${match}</ul>`,
            )
            .replace(/\n\n/g, '<p class="my-3"></p>');
    }

    async function loadData() {
        loading = true;
        error = null;
        try {
            const res = await api.backend.call<AssignmentAnalytics>(
                `/analytics/assignment/${assignmentId}?courseId=${courseId}`,
                { method: "GET" },
            );
            if (res.success) {
                data = res.data;
                // Generate stable random seeds for spectrum dots
                spectrumSeeds = data.spectrum.map(
                    (_, i) => ((i * 2654435761) >>> 0) / 4294967296,
                );
            } else {
                error = res.error ?? "載入失敗";
            }
        } catch (e) {
            console.error("Failed to load assignment analytics", e);
            error = "載入分析資料時發生錯誤";
        } finally {
            loading = false;
        }
    }

    async function generateReport() {
        generating = true;
        try {
            const res = await api.backend.call<
                AssignmentAnalytics["classReport"]
            >("/analytics/class-report", {
                method: "POST",
                body: JSON.stringify({ assignmentId, courseId }),
            });
            if (res.success && data) {
                data.classReport = res.data;
            }
        } catch (e) {
            console.error("Failed to generate report", e);
        } finally {
            generating = false;
        }
    }

    onMount(async () => {
        if (!api.isAuthenticated) await api.authReady;
        await loadData();
    });
</script>

<PageHead
    title="{data?.title ?? '作業分析'} - 班級分析"
    description="Per-assignment class analytics for instructors."
/>

<BaseLayout>
    <div class="container mx-auto max-w-7xl px-4 py-8">
        <!-- Header -->
        <div class="mb-8">
            <a
                href={resolve(`/courses/${courseId}`)}
                class="text-text-secondary hover:text-brand-gold mb-4 inline-flex items-center gap-2 text-sm transition-colors"
            >
                <ArrowLeft class="h-4 w-4" />
                返回課程
            </a>

            <div
                class="flex flex-col justify-between gap-4 md:flex-row md:items-end"
            >
                <div>
                    <h1
                        class="flex items-center gap-3 font-serif text-3xl text-white"
                    >
                        <ChartColumn class="text-brand-gold h-7 w-7" />
                        {data?.title ?? "載入中..."} - 班級分析
                    </h1>
                </div>

                <CosmicButton
                    variant="secondary"
                    onclick={() => (showDetail = !showDetail)}
                >
                    {#if showDetail}
                        <EyeOff class="mr-2 h-4 w-4" />
                        隱藏詳細資訊
                    {:else}
                        <Eye class="mr-2 h-4 w-4" />
                        顯示詳細資訊
                    {/if}
                </CosmicButton>
            </div>
        </div>

        <!-- Loading state -->
        {#if loading}
            <div class="flex flex-col items-center justify-center py-32">
                <Loader2 class="text-brand-gold mb-4 h-8 w-8 animate-spin" />
                <p class="text-text-secondary">載入中...</p>
            </div>
        {:else if error}
            <GlassCard>
                <div class="text-status-error py-12 text-center">
                    <AlertTriangle class="mx-auto mb-4 h-8 w-8" />
                    <p>{error}</p>
                </div>
            </GlassCard>
        {:else if data}
            <!-- Section A: 作業概覽 -->
            <div class="mb-8">
                <GlassCard>
                    <h2
                        class="mb-4 flex items-center gap-2 font-serif text-xl text-white"
                    >
                        <FileText class="text-brand-gold h-5 w-5" />
                        作業概覽
                    </h2>
                    <div
                        class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
                    >
                        <div>
                            <div
                                class="text-text-secondary mb-1 text-sm tracking-wider uppercase"
                            >
                                作業名稱
                            </div>
                            <div class="text-lg font-medium text-white">
                                {data.title}
                            </div>
                        </div>
                        <div>
                            <div
                                class="text-text-secondary mb-1 text-sm tracking-wider uppercase"
                            >
                                截止日期
                            </div>
                            <div
                                class="flex items-center gap-2 text-lg font-medium text-white"
                            >
                                <Calendar class="text-brand-gold h-4 w-4" />
                                {data.dueAt
                                    ? formatDate(data.dueAt)
                                    : "無截止日期"}
                            </div>
                        </div>
                        <div>
                            <div
                                class="text-text-secondary mb-1 text-sm tracking-wider uppercase"
                            >
                                提交狀況
                            </div>
                            <div
                                class="flex items-center gap-2 text-lg font-medium text-white"
                            >
                                <Users class="text-brand-gold h-4 w-4" />
                                {data.submittedCount} / {data.totalStudents} 已提交
                            </div>
                        </div>
                        <div>
                            <div
                                class="text-text-secondary mb-1 text-sm tracking-wider uppercase"
                            >
                                班級平均分數
                            </div>
                            <div class="text-lg font-medium text-white">
                                {#if data.avgScore !== null}
                                    <span
                                        class="text-brand-gold font-mono text-2xl font-bold"
                                    >
                                        {data.avgScore.toFixed(1)}
                                    </span>
                                    <span class="text-text-secondary text-sm">
                                        / 5.0</span
                                    >
                                {:else}
                                    <span class="text-text-secondary"
                                        >尚未評估</span
                                    >
                                {/if}
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>

            <!-- Section B: 學生立場光譜圖 -->
            <div class="mb-8">
                <GlassCard className="flex flex-col">
                    <div class="mb-6">
                        <h2
                            class="flex items-center gap-2 font-serif text-xl text-white"
                        >
                            <BarChart3 class="text-brand-gold h-5 w-5" />
                            學生立場光譜圖
                        </h2>
                        <p class="text-text-secondary text-sm">
                            每個點代表一位學生的立場位置
                        </p>
                    </div>

                    {#if data.spectrum.length > 0}
                        <div class="relative h-48 p-4">
                            <!-- Spectrum axis -->
                            <div
                                class="from-status-error via-brand-silver to-status-success absolute top-1/2 right-4 left-4 h-1 -translate-y-1/2 rounded-full bg-linear-to-r opacity-50"
                            ></div>

                            <!-- Labels -->
                            <div
                                class="text-status-error absolute bottom-0 left-4 text-xs font-bold tracking-wider uppercase"
                            >
                                強烈反對 (-10)
                            </div>
                            <div
                                class="text-text-secondary absolute bottom-0 left-1/2 -translate-x-1/2 text-xs font-bold tracking-wider uppercase"
                            >
                                中立
                            </div>
                            <div
                                class="text-status-success absolute right-4 bottom-0 text-xs font-bold tracking-wider uppercase"
                            >
                                強烈支持 (+10)
                            </div>

                            <!-- Data points -->
                            <div class="absolute inset-4 bottom-8">
                                {#each data.spectrum as point, i (i)}
                                    {@const left =
                                        ((point.stance + 10) / 20) * 100}
                                    {@const top =
                                        (spectrumSeeds[i] ?? 0.5) * 70 + 5}
                                    <div
                                        class="bg-brand-gold group absolute h-3 w-3 cursor-pointer rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all duration-300 hover:z-20 hover:scale-150"
                                        style="left: {left}%; top: {top}%; margin-left: -6px; margin-top: -6px;"
                                    >
                                        {#if showDetail}
                                            <div
                                                class="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded border border-white/20 bg-black/80 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100"
                                            >
                                                {point.name}
                                            </div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {:else}
                        <div
                            class="text-text-secondary py-12 text-center text-sm"
                        >
                            尚無立場資料
                        </div>
                    {/if}
                </GlassCard>
            </div>

            <!-- Section C: 代表性立場摘錄 -->
            {#if data.excerpts.length > 0}
                <div class="mb-8">
                    <GlassCard>
                        <h2
                            class="mb-6 flex items-center gap-2 font-serif text-xl text-white"
                        >
                            <Quote class="text-brand-gold h-5 w-5" />
                            代表性立場摘錄
                        </h2>
                        <div class="grid gap-6 md:grid-cols-2">
                            <!-- Pro excerpts -->
                            <div>
                                <div
                                    class="text-status-success mb-3 text-sm font-bold tracking-wider uppercase"
                                >
                                    支持方觀點
                                </div>
                                <div class="space-y-3">
                                    {#each proExcerpts as excerpt (excerpt.text)}
                                        <div
                                            class="rounded-lg border border-green-500/20 bg-green-500/5 p-4"
                                        >
                                            <p
                                                class="text-text-secondary text-sm italic"
                                            >
                                                "{excerpt.text}"
                                            </p>
                                        </div>
                                    {/each}
                                    {#if proExcerpts.length === 0}
                                        <p class="text-text-secondary text-sm">
                                            尚無支持方摘錄
                                        </p>
                                    {/if}
                                </div>
                            </div>
                            <!-- Con excerpts -->
                            <div>
                                <div
                                    class="text-status-error mb-3 text-sm font-bold tracking-wider uppercase"
                                >
                                    反對方觀點
                                </div>
                                <div class="space-y-3">
                                    {#each conExcerpts as excerpt (excerpt.text)}
                                        <div
                                            class="rounded-lg border border-red-500/20 bg-red-500/5 p-4"
                                        >
                                            <p
                                                class="text-text-secondary text-sm italic"
                                            >
                                                "{excerpt.text}"
                                            </p>
                                        </div>
                                    {/each}
                                    {#if conExcerpts.length === 0}
                                        <p class="text-text-secondary text-sm">
                                            尚無反對方摘錄
                                        </p>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            {/if}

            <!-- Section D: AI 班級報告 -->
            <div class="mb-8">
                <GlassCard>
                    <h2
                        class="mb-4 flex items-center gap-2 font-serif text-xl text-white"
                    >
                        <FileText class="text-brand-gold h-5 w-5" />
                        AI 班級報告
                    </h2>

                    {#if data.classReport}
                        <div class="text-text-secondary mb-3 text-xs">
                            產生於 {formatDate(data.classReport.generatedAt)}
                        </div>

                        {#if data.classReport.submissionCount < data.submittedCount}
                            <div
                                class="mb-4 flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"
                            >
                                <AlertTriangle
                                    class="h-5 w-5 shrink-0 text-amber-400"
                                />
                                <span class="text-sm text-amber-400">
                                    有 {data.submittedCount -
                                        data.classReport.submissionCount} 份新提交，報告可能已過時
                                </span>
                                <CosmicButton
                                    variant="secondary"
                                    className="ml-auto text-sm! py-2!"
                                    onclick={generateReport}
                                    disabled={generating}
                                >
                                    {#if generating}
                                        <Loader2
                                            class="mr-1 h-3 w-3 animate-spin"
                                        />
                                    {/if}
                                    重新產生
                                </CosmicButton>
                            </div>
                        {/if}

                        <div
                            class="prose-invert text-text-secondary max-w-none text-sm leading-relaxed"
                        >
                            <!-- eslint-disable svelte/no-at-html-tags -->
                            {@html renderMarkdown(data.classReport.content)}
                        </div>
                    {:else}
                        <div class="py-8 text-center">
                            <p class="text-text-secondary mb-4">尚未產生報告</p>
                            <CosmicButton
                                variant="primary"
                                onclick={generateReport}
                                disabled={generating ||
                                    data.submittedCount === 0}
                            >
                                {#if generating}
                                    <Loader2
                                        class="mr-2 h-4 w-4 animate-spin"
                                    />
                                    產生中...
                                {:else}
                                    <FileText class="mr-2 h-4 w-4" />
                                    產生班級報告
                                {/if}
                            </CosmicButton>
                            {#if data.submittedCount === 0}
                                <p class="text-text-secondary mt-2 text-xs">
                                    尚無提交，無法產生報告
                                </p>
                            {/if}
                        </div>
                    {/if}
                </GlassCard>
            </div>

            <!-- Section E: 學生成績明細 (detail mode only) -->
            {#if showDetail}
                <div class="mb-8">
                    <GlassCard>
                        <h2
                            class="mb-4 flex items-center gap-2 font-serif text-xl text-white"
                        >
                            <Users class="text-brand-gold h-5 w-5" />
                            學生成績明細
                        </h2>

                        {#if data.scores.length > 0}
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-sm">
                                    <thead>
                                        <tr
                                            class="text-text-secondary border-b border-white/10 text-xs tracking-wider uppercase"
                                        >
                                            {#each scoreHeaders as h (h.key)}
                                                <th
                                                    class="cursor-pointer px-3 py-3 transition-colors hover:text-white"
                                                    onclick={() =>
                                                        toggleSort(h.key)}
                                                >
                                                    <span
                                                        class="inline-flex items-center gap-1"
                                                    >
                                                        {h.label}
                                                        {#if sortKey === h.key}
                                                            <ArrowUpDown
                                                                class="text-brand-gold h-3 w-3"
                                                            />
                                                        {/if}
                                                    </span>
                                                </th>
                                            {/each}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each sortedScores() as score (score.userId)}
                                            <tr
                                                class="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/5"
                                                onclick={() =>
                                                    toggleStudentDetail(
                                                        score.userId,
                                                    )}
                                            >
                                                <td
                                                    class="px-3 py-3 font-medium text-white"
                                                >
                                                    <div
                                                        class="flex items-center gap-2"
                                                    >
                                                        {#if expandedStudents.has(score.userId)}
                                                            <ChevronDown
                                                                class="h-3 w-3 text-white/50"
                                                            />
                                                        {:else}
                                                            <ChevronRight
                                                                class="h-3 w-3 text-white/50"
                                                            />
                                                        {/if}
                                                        {#if score.conversationId}
                                                            <a
                                                                href={resolve(
                                                                    `/conversations/${score.conversationId}`,
                                                                )}
                                                                class="text-brand-gold hover:underline"
                                                                onclick={(e) =>
                                                                    e.stopPropagation()}
                                                            >
                                                                {score.name}
                                                            </a>
                                                        {:else}
                                                            {score.name}
                                                        {/if}
                                                    </div>
                                                </td>
                                                <td
                                                    class="px-3 py-3 font-mono font-bold {score.overallScore <
                                                    2.5
                                                        ? 'text-amber-400'
                                                        : 'text-white'}"
                                                >
                                                    {score.overallScore.toFixed(
                                                        1,
                                                    )}
                                                </td>
                                                <td
                                                    class="px-3 py-3 font-mono {score
                                                        .dimensions
                                                        .argumentQuality < 2.5
                                                        ? 'text-amber-400'
                                                        : 'text-text-secondary'}"
                                                >
                                                    {score.dimensions.argumentQuality.toFixed(
                                                        1,
                                                    )}
                                                </td>
                                                <td
                                                    class="px-3 py-3 font-mono {score
                                                        .dimensions
                                                        .criticalThinking < 2.5
                                                        ? 'text-amber-400'
                                                        : 'text-text-secondary'}"
                                                >
                                                    {score.dimensions.criticalThinking.toFixed(
                                                        1,
                                                    )}
                                                </td>
                                                <td
                                                    class="px-3 py-3 font-mono {score
                                                        .dimensions
                                                        .principleExtraction <
                                                    2.5
                                                        ? 'text-amber-400'
                                                        : 'text-text-secondary'}"
                                                >
                                                    {score.dimensions.principleExtraction.toFixed(
                                                        1,
                                                    )}
                                                </td>
                                                <td
                                                    class="px-3 py-3 font-mono {score
                                                        .dimensions.openness <
                                                    2.5
                                                        ? 'text-amber-400'
                                                        : 'text-text-secondary'}"
                                                >
                                                    {score.dimensions.openness.toFixed(
                                                        1,
                                                    )}
                                                </td>
                                                <td
                                                    class="px-3 py-3 font-mono {score
                                                        .dimensions.coherence <
                                                    2.5
                                                        ? 'text-amber-400'
                                                        : 'text-text-secondary'}"
                                                >
                                                    {score.dimensions.coherence.toFixed(
                                                        1,
                                                    )}
                                                </td>
                                                <td
                                                    class="text-text-secondary px-3 py-3 text-xs"
                                                >
                                                    {score.submittedAt
                                                        ? formatDate(
                                                              score.submittedAt,
                                                          )
                                                        : "-"}
                                                </td>
                                                <td class="px-3 py-3">
                                                    {#if score.late}
                                                        <span
                                                            class="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400"
                                                            >遲交</span
                                                        >
                                                    {:else}
                                                        <span
                                                            class="text-text-secondary text-xs"
                                                            >-</span
                                                        >
                                                    {/if}
                                                </td>
                                            </tr>
                                            {#if expandedStudents.has(score.userId)}
                                                <tr
                                                    class="border-b border-white/5 bg-white/3"
                                                >
                                                    <td
                                                        colspan={scoreHeaders.length}
                                                        class="px-4 py-4"
                                                    >
                                                        <div class="space-y-4">
                                                            <!-- Summary -->
                                                            {#if score.summary}
                                                                <div
                                                                    class="rounded-lg border border-white/10 bg-white/5 p-3"
                                                                >
                                                                    <div
                                                                        class="mb-1 text-xs font-medium text-white/50"
                                                                    >
                                                                        對話摘要
                                                                    </div>
                                                                    <p
                                                                        class="text-sm text-white/80"
                                                                    >
                                                                        {score.summary}
                                                                    </p>
                                                                </div>
                                                            {/if}

                                                            <!-- Stance History -->
                                                            {#if score.stanceHistory && score.stanceHistory.length > 0}
                                                                <div>
                                                                    <div
                                                                        class="mb-2 text-xs font-medium text-white/50"
                                                                    >
                                                                        思考演變歷程
                                                                    </div>
                                                                    <div
                                                                        class="flex flex-wrap gap-2"
                                                                    >
                                                                        {#each score.stanceHistory as stance (stance.version)}
                                                                            <div
                                                                                class="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                                                                            >
                                                                                <div
                                                                                    class="text-brand-gold text-xs font-medium"
                                                                                >
                                                                                    V{stance.version}
                                                                                </div>
                                                                                <div
                                                                                    class="mt-1 text-xs text-white/80"
                                                                                >
                                                                                    {stance.position}
                                                                                </div>
                                                                            </div>
                                                                        {/each}
                                                                    </div>
                                                                </div>
                                                            {/if}

                                                            <!-- Principle History -->
                                                            {#if score.principleHistory && score.principleHistory.length > 0}
                                                                <div>
                                                                    <div
                                                                        class="mb-2 text-xs font-medium text-white/50"
                                                                    >
                                                                        原則提煉歷程
                                                                    </div>
                                                                    <div
                                                                        class="flex flex-wrap gap-2"
                                                                    >
                                                                        {#each score.principleHistory as principle (principle.version)}
                                                                            <div
                                                                                class="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                                                                            >
                                                                                <div
                                                                                    class="text-brand-gold text-xs font-medium"
                                                                                >
                                                                                    V{principle.version}
                                                                                </div>
                                                                                <div
                                                                                    class="mt-1 text-xs text-white/80"
                                                                                >
                                                                                    {principle.statement}
                                                                                </div>
                                                                                {#if principle.classification}
                                                                                    <span
                                                                                        class="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50"
                                                                                    >
                                                                                        {principle.classification}
                                                                                    </span>
                                                                                {/if}
                                                                            </div>
                                                                        {/each}
                                                                    </div>
                                                                </div>
                                                            {/if}

                                                            <!-- Link to full conversation -->
                                                            {#if score.conversationId}
                                                                <a
                                                                    href={resolve(
                                                                        `/conversations/${score.conversationId}`,
                                                                    )}
                                                                    class="text-brand-gold inline-block text-sm hover:underline"
                                                                >
                                                                    查看完整對話記錄
                                                                    →
                                                                </a>
                                                            {/if}
                                                        </div>
                                                    </td>
                                                </tr>
                                            {/if}
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        {:else}
                            <div
                                class="text-text-secondary py-8 text-center text-sm"
                            >
                                尚無學生成績資料
                            </div>
                        {/if}
                    </GlassCard>
                </div>
            {/if}
        {/if}
    </div>
</BaseLayout>
