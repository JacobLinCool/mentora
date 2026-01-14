<script>
    import { m } from "$lib/paraglide/messages";
    import CourseCard from "./CourseCard.svelte";

    let { courses = [] } = $props();
    // courses shape aligned with CourseDoc: [{ id, title, code, ownerId, visibility, thumbnail, ... }]

    function handleCourseClick(courseId) {
        // Navigate to course detail page
        window.location.href = `/courses/${courseId}`;
    }
</script>

<div class="mb-20">
    <h2 class="text-text-primary font-serif-tc mb-6 text-2xl font-bold">
        {m.dashboard_my_courses()}
    </h2>
    <div class="grid gap-4 md:grid-cols-2">
        {#each courses as course (course.id)}
            <CourseCard
                courseName={course.title}
                imageUrl={course.thumbnail?.url ?? "/course-placeholder.jpg"}
                onclick={() => handleCourseClick(course.id)}
            />
        {/each}
    </div>
</div>
