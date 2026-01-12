<script>
    import { page } from "$app/state";
    import { m } from "$lib/paraglide/messages";
</script>

<div class="flex h-screen items-center justify-center bg-[#404040] text-white">
    <div class="text-center">
        <h1 class="text-3xl font-bold">{m.explore_course_details_title()}</h1>
        <p class="mt-4 text-xl">
            {m.explore_course_details_id()}: {page.params.id}
        </p>
        <button
            class="mt-8 rounded-full bg-white/20 px-6 py-2 transition-colors hover:bg-white/30"
            onclick={() => history.back()}
        >
            {m.explore_go_back()}
        </button>
    </div>
</div>
