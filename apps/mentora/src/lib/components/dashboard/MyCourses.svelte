<script>
    import { m } from "$lib/paraglide/messages";
    import CourseCard from "./CourseCard.svelte";

    let { courses = [] } = $props();
    // courses shape: [{ id, name, imageUrl }]

    function handleCourseClick(courseId) {
        // Navigate to course detail page
        window.location.href = `/courses/${courseId}`;
    }
</script>

<div class="mb-20">
    <h2 class="text-text-primary font-serif-tc mb-6 text-2xl font-bold">
        {m.dashboard_my_courses()}
    </h2>
    <div class="space-y-4">
        {#each courses as course}
            <CourseCard
                courseId={course.id}
                courseName={course.name}
                imageUrl={course.imageUrl}
                onclick={() => handleCourseClick(course.id)}
            />
        {/each}
    </div>
</div>
