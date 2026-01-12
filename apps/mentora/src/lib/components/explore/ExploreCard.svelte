<script>
    let { id, title, category, imageUrl, onclick } = $props();
</script>

<button
    class="relative h-64 w-full overflow-hidden rounded-3xl text-left transition-transform hover:scale-[1.02] active:scale-[0.98]"
    {onclick}
>
    <!-- Background Image -->
    <img src={imageUrl} alt={title} class="h-full w-full object-cover" />

    <!-- Gradient Overlay -->
    <div
        class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
    ></div>

    <!-- Category Pill -->
    <div class="absolute top-4 left-4">
        <span
            class="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-800 shadow-sm backdrop-blur-sm"
        >
            {category}
        </span>
    </div>

    <!-- Content -->
    <div
        class="absolute right-0 bottom-0 left-0 flex items-end justify-between p-6"
    >
        <h3 class="text-2xl font-bold text-white">{title}</h3>

        <!-- Arrow Button -->
        <div
            class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition-colors hover:bg-white/30"
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
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
            </svg>
        </div>
    </div>
</button>
