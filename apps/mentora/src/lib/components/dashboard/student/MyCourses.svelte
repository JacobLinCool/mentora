<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import CourseCard from "./CourseCard.svelte";

    interface Course {
        id: string;
        title: string;
        thumbnail?: { url: string | null } | null;
    }

    interface Props {
        courses?: Course[];
    }

    let { courses = [] }: Props = $props();

    function handleCourseClick(courseId: string): void {
        // Navigate to course detail page
        goto(resolve(`/courses/${courseId}`));
    }

    function handleExploreClick(): void {
        goto(resolve("/explore"));
    }
</script>

<div class="mb-20">
    <h2 class="text-text-primary font-serif-tc mb-6 text-2xl font-bold">
        {m.dashboard_my_courses()}
    </h2>
    {#if courses.length === 0}
        <div
            class="rounded-3xl border border-white/20 bg-white/5 p-6 text-white"
        >
            <h3 class="text-xl font-bold">
                {m.dashboard_courses_empty_title()}
            </h3>
            <p class="mt-2 text-sm text-white/80">
                {m.dashboard_courses_empty_description()}
            </p>
            <button
                class="mt-5 inline-flex items-center rounded-2xl border border-white/20 bg-white px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-85"
                onclick={handleExploreClick}
            >
                {m.dashboard_courses_empty_cta()}
            </button>
        </div>
    {:else}
        <div class="grid gap-4 md:grid-cols-2">
            {#each courses as course (course.id)}
                <CourseCard
                    courseName={course.title}
                    imageUrl={course.thumbnail?.url ??
                        "/course-placeholder.jpg"}
                    onclick={() => handleCourseClick(course.id)}
                />
            {/each}
        </div>
    {/if}
</div>
