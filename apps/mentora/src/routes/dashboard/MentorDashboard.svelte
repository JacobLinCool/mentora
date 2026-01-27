<script lang="ts">
    import { Plus } from "@lucide/svelte";
    import MentorLayout from "$lib/components/layout/mentor/MentorLayout.svelte";

    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import CreateCourseModal from "$lib/components/course/CreateCourseModal.svelte";
    import UsageChart from "$lib/components/dashboard/mentor/UsageChart.svelte";

    // Mock user name
    let userName = "Omuba";
    let isCreateModalOpen = $state(false);

    // Mock Usage Data
    const usageData = [
        { day: "Mon", input: 1200, output: 800 },
        { day: "Tue", input: 1500, output: 950 },
        { day: "Wed", input: 800, output: 400 },
        { day: "Thu", input: 2000, output: 1200 },
        { day: "Fri", input: 1800, output: 1100 },
        { day: "Sat", input: 600, output: 300 },
        { day: "Sun", input: 400, output: 200 },
    ];

    // Mock courses data
    interface Course {
        id: number;
        name: string;
        tag: string;
        createdDate: string;
        visibility: string;
    }

    let courses = $state<Course[]>([
        {
            id: 1,
            name: "course 1",
            tag: "Computer Science",
            createdDate: "2026.01.14 23:59",
            visibility: "Public",
        },
        {
            id: 2,
            name: "course 2",
            tag: "Society",
            createdDate: "2026.01.14 23:59",
            visibility: "Private",
        },
        {
            id: 3,
            name: "course 3",
            tag: "Critical Thinking",
            createdDate: "2026.01.14 23:59",
            visibility: "Non-Public",
        },
        {
            id: 4,
            name: "course 4",
            tag: "",
            createdDate: "2026.01.14 23:59",
            visibility: "Non-Public",
        },
    ]);

    function handleCreateCourse(newCourse: Course) {
        courses = [newCourse, ...courses];
    }
</script>

<svelte:head>
    <title>Mentor Dashboard - Mentora</title>
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
                Hello, {userName}.
            </h1>
        </div>

        <!-- Usage Section -->
        <div class="mb-12">
            <h2 class="mb-4 text-xl font-normal">Usage</h2>
            <div class="rounded-xl bg-white p-6 shadow-sm">
                <div class="mb-6 flex items-center justify-between">
                    <div>
                        <h3 class="text-lg font-medium text-gray-900">
                            Weekly Token Spending
                        </h3>
                        <p class="text-sm text-gray-500">
                            Input vs Output tokens over the last 7 days
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
                <h2 class="text-xl font-normal">My Courses</h2>
                <div class="flex gap-4">
                    <button
                        class="flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50"
                        onclick={() => (isCreateModalOpen = true)}
                    >
                        <Plus size={16} />
                        Create
                    </button>
                    <button
                        class="cursor-pointer rounded-full bg-white px-4 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50"
                    >
                        Show Archived
                    </button>
                </div>
            </div>

            <div class="overflow-hidden rounded-xl bg-white shadow-sm">
                <table class="w-full text-left text-sm">
                    <thead>
                        <tr class="bg-[#F5F5F5] text-gray-600">
                            <th class="px-6 py-4 font-medium">Name</th>
                            <th class="px-6 py-4 font-medium">Tag</th>
                            <th class="px-6 py-4 font-medium">Created Date</th>
                            <th class="px-6 py-4 font-medium">Visibility</th>
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
                                    >{course.name}</td
                                >
                                <td class="px-6 py-4 text-gray-600"
                                    >{course.tag}</td
                                >
                                <td class="px-6 py-4 text-gray-600"
                                    >{course.createdDate}</td
                                >
                                <td class="px-6 py-4 text-gray-600"
                                    >{course.visibility}</td
                                >
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</MentorLayout>
