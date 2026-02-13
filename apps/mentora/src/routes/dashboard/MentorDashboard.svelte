<script lang="ts">
    import { Plus } from "@lucide/svelte";
    import MentorLayout from "$lib/components/layout/mentor/MentorLayout.svelte";
    import { m } from "$lib/paraglide/messages";

    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import CreateCourseModal from "$lib/components/course/CreateCourseModal.svelte";
    import UsageChart from "$lib/components/dashboard/mentor/UsageChart.svelte";
    import { api, type Course } from "$lib/api";

    let isCreateModalOpen = $state(false);

    // Initial State
    let courses = $state<Course[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let isLoadingCourses = $state(true);

    // Current User Display Name
    const userName = $derived(api.currentUserProfile?.displayName || "Mentor");

    // Mock Usage Data (Pending Analytics API)
    const usageData = [
        { day: m.mentor_dashboard_day_mon(), input: 1200, output: 800 },
        { day: m.mentor_dashboard_day_tue(), input: 1500, output: 950 },
        { day: m.mentor_dashboard_day_wed(), input: 800, output: 400 },
        { day: m.mentor_dashboard_day_thu(), input: 2000, output: 1200 },
        { day: m.mentor_dashboard_day_fri(), input: 1800, output: 1100 },
        { day: m.mentor_dashboard_day_sat(), input: 600, output: 300 },
        { day: m.mentor_dashboard_day_sun(), input: 400, output: 200 },
    ];

    async function loadCourses() {
        isLoadingCourses = true;
        const result = await api.courses.listMine();
        if (result.success) {
            courses = result.data;
        } else {
            console.error("Failed to load courses", result.error);
        }
        isLoadingCourses = false;
    }

    $effect(() => {
        if (api.isAuthenticated) {
            loadCourses();
        }
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
                visibility: data.visibility as
                    | "public"
                    | "private"
                    | "unlisted",
            },
        );

        if (result.success) {
            // Reload courses or prepend locally
            await loadCourses();
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
                        onclick={() => (isCreateModalOpen = true)}
                    >
                        <Plus size={16} />
                        {m.mentor_dashboard_create()}
                    </button>
                    <button
                        class="cursor-pointer rounded-full bg-white px-4 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50"
                    >
                        {m.mentor_dashboard_show_archived()}
                    </button>
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
                        {#each courses as course (course.id)}
                            <tr
                                class="cursor-pointer transition-colors hover:bg-[#F5F5F5]"
                                onclick={() =>
                                    goto(resolve(`/courses/${course.id}`))}
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
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</MentorLayout>
