<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { m } from "$lib/paraglide/messages";
    import BottomNav from "$lib/components/dashboard/BottomNav.svelte";
    import { api, type Course, type Topic } from "$lib/api";

    const courseId = $derived(page.params.id);

    let course = $state<Course | null>(null);
    let topics = $state<Topic[]>([]);
    let loading = $state(true);
    // let error = $state<string | null>(null);
    let isEnrolled = $state(false);
    let joining = $state(false);

    onMount(async () => {
        if (courseId) {
            await loadData();
        }
    });

    async function loadData() {
        loading = true;
        try {
            const [courseRes, topicsRes, enrolledRes] = await Promise.all([
                api.courses.get(courseId),
                api.topics.listForCourse(courseId),
                api.courses.listEnrolled({ limit: 100 }),
            ]);

            if (courseRes.success) {
                course = courseRes.data;
            } else {
                console.error(courseRes.error);
            }

            if (topicsRes.success) {
                topics = topicsRes.data;
            }

            if (enrolledRes.success && course) {
                isEnrolled = enrolledRes.data.some((c) => c.id === courseId);
            }
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    }

    async function handleJoinClick() {
        if (!course) return;

        if (isEnrolled) {
            goto(resolve(`/courses/${course.id}`));
            return;
        }

        joining = true;
        const result = await api.courses.joinByCode(course.code || "");

        if (result.success) {
            isEnrolled = true;
            goto(resolve(`/courses/${course.id}`));
        } else {
            console.error(result.error);
        }
        joining = false;
    }
</script>

<svelte:head>
    <title>{course?.code || "Loading"} - {m.explore_title()} - Mentora</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-[#404040] to-[#6b6b6b] pb-24">
    <!-- Back Button -->
    <div class="absolute top-4 left-4 z-10">
        <button
            aria-label={m.explore_go_back()}
            class="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md transition-all hover:bg-black/50 active:scale-95"
            onclick={() => goto(resolve("/explore"))}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="text-white"
            >
                <path d="m15 18-6-6 6-6" />
            </svg>
        </button>
    </div>

    {#if loading || !course}
        <div class="flex h-screen items-center justify-center text-white">
            Loading...
        </div>
    {:else}
        <!-- Hero Image Section -->
        <div class="relative h-80 overflow-hidden">
            <!-- Background Image with Overlay -->
            <div class="absolute inset-0">
                <img
                    src={course.thumbnail?.url ?? "/course-placeholder.jpg"}
                    alt={course.code}
                    class="h-full w-full object-cover"
                />
                <!-- Dark gradient overlay -->
                <div
                    class="absolute inset-0 bg-gradient-to-b from-transparent via-[#404040]/60 to-[#404040]"
                ></div>
            </div>

            <!-- Course ID and Title Overlay -->
            <div class="absolute inset-0 flex flex-col justify-end p-6 pb-6">
                <h1
                    class="mb-4 font-serif text-4xl font-bold tracking-wide text-white"
                >
                    {course.code}
                </h1>
            </div>
        </div>

        <!-- Join Course Button & Intro Title -->
        <div class="mx-auto max-w-md px-6 pt-6">
            <div class="mb-6 flex items-center justify-between">
                <h2 class="text-3xl text-white">{course.title}</h2>
                <button
                    class="cursor-pointer rounded-full px-6 py-2 text-sm font-medium transition-all hover:scale-105 active:scale-95 {isEnrolled
                        ? 'bg-emerald-500/90 text-white hover:bg-emerald-500'
                        : 'bg-white/80 text-gray-800 hover:bg-white'}"
                    onclick={handleJoinClick}
                    disabled={joining}
                >
                    {#if joining}
                        Loading...
                    {:else}
                        {isEnrolled
                            ? m.explore_enter_course()
                            : m.explore_join_course()}
                    {/if}
                </button>
            </div>
        </div>

        <!-- Course Content Section -->
        <div class="mx-auto max-w-md px-6">
            <!-- Description -->
            <div class="mb-8">
                <p
                    class="text-base leading-relaxed whitespace-pre-line text-white/90"
                >
                    {course.description || "No description available"}
                </p>
            </div>

            <!-- Topics Section -->
            <div>
                <h3 class="mb-4 font-serif text-3xl font-bold text-white">
                    {m.explore_topics()}
                </h3>
                <div class="space-y-3">
                    {#each topics as topic, index (index)}
                        <button
                            class="w-full cursor-pointer rounded-2xl bg-white/10 px-5 py-4 text-left backdrop-blur-sm transition-all hover:bg-white/20 active:scale-[0.98]"
                            onclick={() => {
                                /* Handle topic click */
                            }}
                        >
                            <p class="text-base text-white">{topic.title}</p>
                        </button>
                    {/each}
                </div>
            </div>
        </div>
    {/if}

    <!-- Bottom Navigation -->
    <BottomNav activeTab="explore" />
</div>
