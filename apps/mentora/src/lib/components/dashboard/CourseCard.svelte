<script>
    let { courseId, courseName, imageUrl, onclick } = $props();
</script>

<button
    class="relative h-48 w-full overflow-hidden rounded-3xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
    {onclick}
>
    <img src={imageUrl} alt={courseName} class="h-full w-full object-cover" />
    <div
        class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
    ></div>
    <div class="absolute right-0 bottom-0 left-0 p-6">
        <h3 class="text-left text-2xl font-bold text-white">{courseName}</h3>
    </div>
</button>
