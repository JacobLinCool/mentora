<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { ArrowLeft } from "@lucide/svelte";
    import { m } from "$lib/paraglide/messages";
    import BottomNav from "$lib/components/layout/student/BottomNav.svelte";
    import { api, type Course, type Topic } from "$lib/api";
    import posthog from "posthog-js";

    const courseId = $derived(page.params.id);

    let course = $state<Course | null>(null);
    let topics = $state<Topic[]>([]);
    let loading = $state(true);
    // let error = $state<string | null>(null); // Unused
    let isEnrolled = $state(false);
    let joining = $state(false);

    onMount(async () => {
        if (courseId) {
            await loadData();
        }
    });

    async function loadData() {
        if (!courseId) return;
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
                // error = courseRes.error;
            }

            if (topicsRes.success) {
                topics = topicsRes.data.sort(
                    (a, b) => (a.order || 0) - (b.order || 0),
                );
            }

            if (enrolledRes.success && course) {
                isEnrolled = enrolledRes.data.some((c) => c.id === courseId);
            }
        } catch {
            // error = "Failed to load course";
        } finally {
            loading = false;
        }
    }

    async function handleJoinClick() {
        if (!course) return;

        if (isEnrolled) {
            posthog.capture("course_entered", {
                course_id: course.id,
                source: "explore_detail",
            });
            goto(resolve(`/courses/${course.id}`));
            return;
        }

        joining = true;
        const result = await api.courses.joinByCode(course.code || "");

        if (result.success) {
            posthog.capture("course_enrolled", {
                course_id: course.id,
                course_title: course.title,
                source: "explore_detail",
            });
            isEnrolled = true;
            goto(resolve(`/courses/${course.id}`));
        } else {
            posthog.capture("course_join_failed", {
                course_id: course.id,
                source: "explore_detail",
                error: result.error ?? "unknown_error",
            });
            console.error(result.error);
        }
        joining = false;
    }
</script>

<svelte:head>
    <title>{course?.title || m.loading()} - {m.explore_title()} - Mentora</title
    >
</svelte:head>

<div class="student-shell">
    <div class="absolute top-4 left-4 z-10">
        <button
            aria-label={m.explore_go_back()}
            class="student-icon-btn rounded-full transition-all active:scale-95"
            onclick={() => goto(resolve("/explore"))}
        >
            <ArrowLeft class="h-5 w-5 text-white" />
        </button>
    </div>

    {#if loading || !course}
        <div class="flex h-screen items-center justify-center text-white">
            {m.loading()}
        </div>
    {:else}
        <div
            class="relative h-[18.5rem] overflow-hidden border-b border-white/10"
        >
            <div class="absolute inset-0">
                <img
                    src={course.thumbnail?.url ?? "/course-placeholder.jpg"}
                    alt={course.code}
                    class="h-full w-full object-cover"
                />
                <div
                    class="absolute inset-0 bg-linear-to-b from-black/10 via-[#3f3f3f]/38 to-[#3f3f3f]"
                ></div>
            </div>

            <div class="absolute inset-0 flex flex-col justify-end p-6 pb-7">
                <div class="mb-4 flex flex-wrap gap-2">
                    {#if course.theme}
                        <span
                            class="px-1 py-1 text-[0.68rem] font-semibold tracking-[0.18em] text-white/72 uppercase"
                        >
                            {course.theme}
                        </span>
                    {/if}
                    <span
                        class="px-1 py-1 text-[0.68rem] font-semibold tracking-[0.18em] text-white/72 uppercase"
                    >
                        {m.explore_topics_count({ count: topics.length })}
                    </span>
                </div>
                <h1
                    class="font-serif-tc max-w-[16rem] text-[2.25rem] leading-[1.08] font-bold tracking-[0.03em] text-white"
                >
                    {course.title}
                </h1>
            </div>
        </div>

        <main
            class="student-container mx-auto flex max-w-md flex-col gap-7 pt-5 pb-28"
        >
            <section>
                <div class="mb-4 flex items-end justify-between gap-3">
                    <div>
                        <h2
                            class="font-serif-tc text-[2rem] leading-none font-bold text-white"
                        >
                            {m.explore_course_intro_title()}
                        </h2>
                    </div>
                    <button
                        class="student-panel student-panel-hover student-clickable cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold text-white active:scale-[0.98] {isEnrolled
                            ? 'bg-white/10'
                            : ''}"
                        onclick={handleJoinClick}
                        disabled={joining}
                    >
                        {#if joining}
                            {m.loading()}
                        {:else}
                            {isEnrolled
                                ? m.explore_enter_course()
                                : m.explore_join_course()}
                        {/if}
                    </button>
                </div>

                <p
                    class="m-0 text-[1rem] leading-[1.8] whitespace-pre-line text-white/78"
                >
                    {course.description || m.explore_course_intro_empty()}
                </p>
            </section>

            <section>
                <div class="mb-4">
                    <h3
                        class="font-serif-tc text-[2rem] leading-none font-bold text-white"
                    >
                        {m.explore_topics()}
                    </h3>
                </div>

                {#if topics.length > 0}
                    <div class="space-y-0">
                        {#each topics as topic, index (topic.id)}
                            <div
                                class="py-4 {index < topics.length - 1
                                    ? 'border-b border-white/10'
                                    : ''}"
                            >
                                <div
                                    class="mb-2 text-[0.72rem] font-semibold tracking-[0.18em] text-white/42 uppercase"
                                >
                                    {m.explore_topic_label({
                                        number: String(index + 1).padStart(
                                            2,
                                            "0",
                                        ),
                                    })}
                                </div>
                                <h4
                                    class="m-0 text-[1.18rem] leading-snug font-semibold text-white"
                                >
                                    {topic.title}
                                </h4>
                                {#if topic.description}
                                    <p
                                        class="mt-2.5 mb-0 max-w-[34rem] text-[0.97rem] leading-[1.8] text-white/62"
                                    >
                                        {topic.description}
                                    </p>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="m-0 py-2 text-sm leading-relaxed text-white/55">
                        {m.explore_topics_empty()}
                    </p>
                {/if}
            </section>
        </main>
    {/if}

    <BottomNav activeTab="explore" />
</div>
