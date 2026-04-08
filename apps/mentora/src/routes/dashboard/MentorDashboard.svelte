<script lang="ts">
    import { Plus } from "@lucide/svelte";
    import MentorLayout from "$lib/components/layout/mentor/MentorLayout.svelte";
    import { m } from "$lib/paraglide/messages";
    import { onMount } from "svelte";
    import { SvelteMap, SvelteSet } from "svelte/reactivity";
    import { db } from "$lib/firebase";
    import { collectionGroup, getDocs, query, where } from "firebase/firestore";

    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import CreateCourseModal from "$lib/components/course/CreateCourseModal.svelte";
    import UsageChart from "$lib/components/dashboard/mentor/UsageChart.svelte";
    import { api, type Course } from "$lib/api";
    import posthog from "posthog-js";

    let isCreateModalOpen = $state(false);
    let showArchivedCourses = $state(false);

    let ownedCourses = $state<Course[]>([]);
    let ownedCoursesLoading = $state(false);
    let ownedCoursesError = $state<string | null>(null);
    let teachingCourses = $state<Course[]>([]);
    let teachingCoursesLoading = $state(false);
    let teachingCoursesError = $state<string | null>(null);

    const coursesLoading = $derived(
        ownedCoursesLoading || teachingCoursesLoading,
    );
    const coursesError = $derived(ownedCoursesError || teachingCoursesError);

    // Current User Display Name
    const userName = $derived(api.currentUserProfile?.displayName || "Mentor");

    type TokenUsageDay = {
        date: string;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        byFeature: Record<
            string,
            {
                inputTokenCount: number;
                outputTokenCount: number;
                totalTokenCount: number;
            }
        >;
    };

    type TokenUsageAnalyticsResponse = {
        days: TokenUsageDay[];
        totals: {
            inputTokens: number;
            outputTokens: number;
            totalTokens: number;
            byFeature: Record<
                string,
                {
                    inputTokenCount: number;
                    outputTokenCount: number;
                    totalTokenCount: number;
                }
            >;
        };
        windowDays: number;
    };

    type UsagePoint = { day: string; input: number; output: number };

    let usageData = $state<UsagePoint[]>(buildFallbackUsageData());

    function getArchivedAt(course: Course): number | null {
        const archivedAt = (course as Course & { archivedAt?: unknown })
            .archivedAt;
        return typeof archivedAt === "number" ? archivedAt : null;
    }

    function isArchivedCourse(course: Course): boolean {
        const archivedAt = getArchivedAt(course);
        return archivedAt !== null && archivedAt > 0;
    }

    function mergeCourseLists(
        primary: Course[],
        secondary: Course[],
    ): Course[] {
        const merged = new SvelteMap<string, Course>();

        for (const course of [...primary, ...secondary]) {
            merged.set(course.id, course);
        }

        return [...merged.values()].sort((a, b) => b.createdAt - a.createdAt);
    }

    const allCourses = $derived(
        mergeCourseLists(ownedCourses, teachingCourses),
    );
    const supportsArchivedCourses = $derived(
        allCourses.some((course) => getArchivedAt(course) !== null),
    );
    const visibleCourses = $derived(
        supportsArchivedCourses
            ? allCourses.filter(
                  (course) => showArchivedCourses || !isArchivedCourse(course),
              )
            : allCourses,
    );

    $effect(() => {
        if (!supportsArchivedCourses && showArchivedCourses) {
            showArchivedCourses = false;
        }
    });

    function labelFromWeekdayIndex(day: number): string {
        switch (day) {
            case 0:
                return m.mentor_dashboard_day_sun();
            case 1:
                return m.mentor_dashboard_day_mon();
            case 2:
                return m.mentor_dashboard_day_tue();
            case 3:
                return m.mentor_dashboard_day_wed();
            case 4:
                return m.mentor_dashboard_day_thu();
            case 5:
                return m.mentor_dashboard_day_fri();
            case 6:
                return m.mentor_dashboard_day_sat();
            default:
                return "";
        }
    }

    function buildFallbackUsageData(): UsagePoint[] {
        return [
            { day: m.mentor_dashboard_day_mon(), input: 0, output: 0 },
            { day: m.mentor_dashboard_day_tue(), input: 0, output: 0 },
            { day: m.mentor_dashboard_day_wed(), input: 0, output: 0 },
            { day: m.mentor_dashboard_day_thu(), input: 0, output: 0 },
            { day: m.mentor_dashboard_day_fri(), input: 0, output: 0 },
            { day: m.mentor_dashboard_day_sat(), input: 0, output: 0 },
            { day: m.mentor_dashboard_day_sun(), input: 0, output: 0 },
        ];
    }

    function mapTokenUsageToChart(days: TokenUsageDay[]): UsagePoint[] {
        return days.map((entry) => {
            const weekday = new Date(`${entry.date}T00:00:00.000Z`).getUTCDay();
            return {
                day: labelFromWeekdayIndex(weekday),
                input: entry.inputTokens,
                output: entry.outputTokens,
            };
        });
    }

    async function loadTokenUsage() {
        const response = await api.backend.call<TokenUsageAnalyticsResponse>(
            "/analytics/token-usage?days=7",
            {
                method: "GET",
            },
        );

        if (!response.success) {
            usageData = buildFallbackUsageData();
            console.warn("Failed to load token analytics:", response.error);
            return;
        }

        usageData = mapTokenUsageToChart(response.data.days);
    }

    async function loadOwnedCourses() {
        if (!api.isAuthenticated) {
            ownedCourses = [];
            ownedCoursesError = null;
            ownedCoursesLoading = false;
            return;
        }

        ownedCoursesLoading = true;
        ownedCoursesError = null;

        const response = await api.courses.listMine();
        if (response.success) {
            ownedCourses = response.data;
        } else {
            ownedCourses = [];
            ownedCoursesError = response.error;
        }

        ownedCoursesLoading = false;
    }

    async function loadTeachingCourses() {
        if (!api.isAuthenticated || !api.currentUser) {
            teachingCourses = [];
            teachingCoursesError = null;
            teachingCoursesLoading = false;
            return;
        }

        teachingCoursesLoading = true;
        teachingCoursesError = null;

        try {
            const rosterQuery = query(
                collectionGroup(db, "roster"),
                where("userId", "==", api.currentUser.uid),
                where("status", "==", "active"),
            );

            const rosterSnapshot = await getDocs(rosterQuery);
            const teachingCourseIds = new SvelteSet<string>();

            for (const doc of rosterSnapshot.docs) {
                const data = doc.data() as { role?: unknown };
                if (data.role !== "instructor" && data.role !== "ta") {
                    continue;
                }

                const pathSegments = doc.ref.path.split("/");
                const courseId = pathSegments[1];
                if (courseId) {
                    teachingCourseIds.add(courseId);
                }
            }

            if (teachingCourseIds.size === 0) {
                teachingCourses = [];
                return;
            }

            const teachingResults = await Promise.all(
                [...teachingCourseIds].map((courseId) =>
                    api.courses.get(courseId),
                ),
            );

            teachingCourses = teachingResults
                .filter(
                    (result): result is { success: true; data: Course } =>
                        result.success,
                )
                .map((result) => result.data);
        } catch (error) {
            const detail =
                error instanceof Error ? error.message : m.courses_error();
            teachingCoursesError = detail;
            teachingCourses = [];
        } finally {
            teachingCoursesLoading = false;
        }
    }

    onMount(async () => {
        if (!api.isAuthenticated) {
            await api.authReady;
        }
        if (!api.isAuthenticated) {
            usageData = buildFallbackUsageData();
            return;
        }
        await loadTokenUsage();
        await loadOwnedCourses();
        await loadTeachingCourses();
    });

    $effect(() => {
        if (api.isAuthenticated) {
            void loadOwnedCourses();
            return;
        }

        ownedCourses = [];
        ownedCoursesLoading = false;
        ownedCoursesError = null;
    });

    $effect(() => {
        if (api.isAuthenticated) {
            void loadTeachingCourses();
            return;
        }

        teachingCourses = [];
        teachingCoursesLoading = false;
        teachingCoursesError = null;
    });

    async function handleCreateCourse(data: {
        title: string;
        code: string;
        visibility: string;
        description: string;
    }) {
        const result = await api.courses.create(
            data.title,
            data.code || undefined,
            {
                description: data.description,
                visibility: data.visibility as "public" | "private",
            },
        );

        if (result.success) {
            goto(resolve(`/courses/${result.data}`));
        } else {
            console.error("Failed to create course", result.error);
            throw new Error(result.error || "Failed to create course");
        }
    }

    function formatDate(timestamp: number) {
        return new Date(timestamp)
            .toLocaleDateString("zh-TW", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            })
            .replace(/\//g, ".");
    }
</script>

<svelte:head>
    <title>{m.mentor_dashboard_title()} - Mentora</title>
</svelte:head>

<MentorLayout>
    <CreateCourseModal
        bind:open={isCreateModalOpen}
        onCreate={handleCreateCourse}
    />

    <!-- Main Content -->
    <div class="mx-auto max-w-5xl px-8 pt-12 pb-24">
        <!-- Greeting -->
        <div class="mb-12">
            <h1 class="font-serif-tc text-4xl font-bold tracking-tight">
                {m.mentor_dashboard_greeting({ name: userName })}
            </h1>
        </div>

        <!-- Usage Section -->
        <div class="mb-12">
            <h2 class="mb-4 text-xl font-normal">
                {m.mentor_dashboard_usage()}
            </h2>
            <div class="rounded-xl bg-white p-6 shadow-sm">
                <div class="mb-6 flex items-center justify-between">
                    <div>
                        <h3 class="text-lg font-medium text-gray-900">
                            {m.mentor_dashboard_weekly_token_spending()}
                        </h3>
                        <p class="text-sm text-gray-500">
                            {m.mentor_dashboard_weekly_token_subtitle()}
                        </p>
                    </div>
                </div>

                <!-- Chart Container -->
                <UsageChart data={usageData} />
            </div>
        </div>

        <!-- Courses Section -->
        <div>
            <div class="mb-4 flex items-center justify-between">
                <h2 class="text-xl font-normal">
                    {m.mentor_dashboard_my_courses()}
                </h2>
                <div class="flex gap-4">
                    <button
                        class="flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50"
                        onclick={() => {
                            posthog.capture(
                                "mentor_create_course_modal_opened",
                                {
                                    source: "dashboard",
                                },
                            );
                            isCreateModalOpen = true;
                        }}
                    >
                        <Plus size={16} />
                        {m.mentor_dashboard_create()}
                    </button>
                    {#if supportsArchivedCourses}
                        <button
                            class="cursor-pointer rounded-full bg-white px-4 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50"
                            class:bg-[#5A5A5A]={showArchivedCourses}
                            class:text-white={showArchivedCourses}
                            onclick={() => {
                                const next = !showArchivedCourses;
                                posthog.capture(
                                    "mentor_archived_courses_toggled",
                                    {
                                        show_archived: next,
                                    },
                                );
                                showArchivedCourses = next;
                            }}
                        >
                            {m.mentor_dashboard_show_archived()}
                        </button>
                    {/if}
                </div>
            </div>

            <div class="overflow-hidden rounded-xl bg-white shadow-sm">
                <table class="w-full text-left text-sm">
                    <thead>
                        <tr class="bg-[#F5F5F5] text-gray-600">
                            <th class="px-6 py-4 font-medium">
                                {m.mentor_dashboard_table_name()}
                            </th>
                            <th class="px-6 py-4 font-medium">
                                {m.mentor_dashboard_table_tag()}
                            </th>
                            <th class="px-6 py-4 font-medium">
                                {m.mentor_dashboard_table_created_date()}
                            </th>
                            <th class="px-6 py-4 font-medium">
                                {m.mentor_dashboard_table_visibility()}
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[#F5F5F5]">
                        {#if coursesLoading}
                            <tr>
                                <td
                                    class="px-6 py-8 text-center text-gray-500"
                                    colspan="4"
                                >
                                    {m.courses_loading()}
                                </td>
                            </tr>
                        {:else if coursesError}
                            <tr>
                                <td
                                    class="px-6 py-8 text-center text-red-500"
                                    colspan="4"
                                >
                                    {m.courses_error()}: {coursesError}
                                </td>
                            </tr>
                        {:else if visibleCourses.length === 0}
                            <tr>
                                <td
                                    class="px-6 py-8 text-center text-gray-500"
                                    colspan="4"
                                >
                                    {m.courses_empty()}
                                </td>
                            </tr>
                        {:else}
                            {#each visibleCourses as course (course.id)}
                                <tr
                                    class="cursor-pointer transition-colors hover:bg-[#F5F5F5]"
                                    onclick={() => {
                                        posthog.capture(
                                            "mentor_course_opened",
                                            {
                                                course_id: course.id,
                                                visibility: course.visibility,
                                                is_archived:
                                                    isArchivedCourse(course),
                                            },
                                        );
                                        goto(resolve(`/courses/${course.id}`));
                                    }}
                                >
                                    <td class="px-6 py-4 text-gray-900"
                                        >{course.title}</td
                                    >
                                    <td class="px-6 py-4 text-gray-600"
                                        >{course.code || "General"}</td
                                    >
                                    <td class="px-6 py-4 text-gray-600"
                                        >{formatDate(course.createdAt)}</td
                                    >
                                    <td class="px-6 py-4 text-gray-600">
                                        {course.visibility === "public"
                                            ? m.mentor_dashboard_visibility_public()
                                            : course.visibility === "private"
                                              ? m.mentor_dashboard_visibility_private()
                                              : m.mentor_dashboard_visibility_non_public()}
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</MentorLayout>
