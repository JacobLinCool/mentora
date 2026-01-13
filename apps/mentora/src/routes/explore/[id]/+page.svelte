<script lang="ts">
    import { page } from "$app/state";
    import { m } from "$lib/paraglide/messages";
    import BottomNav from "$lib/components/dashboard/BottomNav.svelte";

    // Mock course data - in a real app, this would be fetched based on page.params.id
    const courseData = {
        course01: {
            id: "COURSE01",
            title: m.explore_intro(),
            imageUrl:
                "https://upload.wikimedia.org/wikipedia/en/6/66/Teletubbies_logo.png",
            category: "Psychology",
            description:
                "這是一堂非常好的課，因為每個人都可以拿到A+。\n這是一堂非常好的課，因為每個人都可以拿到A+。\n這是一堂非常好的課，因為每個人都可以拿到A+。",
            topics: [
                "高中生去學校要不要帶手機",
                "高中生去學校要不要帶手機",
                "高中生去學校要不要帶手機",
                "高中生去學校要不要帶手機",
            ],
        },
        course02: {
            id: "COURSE02",
            title: m.explore_intro(),
            imageUrl:
                "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Stick_Figure.svg/1200px-Stick_Figure.svg.png",
            category: "History",
            description:
                "這是一堂非常好的課，因為每個人都可以拿到A+。\n這是一堂非常好的課，因為每個人都可以拿到A+。\n這是一堂非常好的課，因為每個人都可以拿到A+。",
            topics: [
                "探索歷史的意義",
                "歷史人物分析",
                "重要歷史事件",
                "歷史與現代社會",
            ],
        },
        course03: {
            id: "COURSE03",
            title: m.explore_intro(),
            imageUrl: "/course-placeholder.jpg",
            category: "Logic",
            description:
                "這是一堂非常好的課，因為每個人都可以拿到A+。\n這是一堂非常好的課，因為每個人都可以拿到A+。\n這是一堂非常好的課，因為每個人都可以拿到A+。",
            topics: ["邏輯推理基礎", "批判性思考", "論證分析", "邏輯謬誤識別"],
        },
    };

    // Get the course data based on the ID from the URL
    const course =
        courseData[page.params.id as keyof typeof courseData] ||
        courseData.course01;
</script>

<svelte:head>
    <title>{course.id} - {m.explore_title()} - Mentora</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-[#404040] to-[#6b6b6b] pb-24">
    <!-- Back Button -->
    <div class="absolute top-4 left-4 z-10">
        <button
            aria-label={m.explore_go_back()}
            class="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md transition-all hover:bg-black/50 active:scale-95"
            onclick={() => (window.location.href = "/explore")}
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

    <!-- Hero Image Section -->
    <div class="relative h-80 overflow-hidden">
        <!-- Background Image with Overlay -->
        <div class="absolute inset-0">
            <img
                src={course.imageUrl}
                alt={course.id}
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
                {course.id}
            </h1>
        </div>
    </div>

    <!-- Join Course Button & Intro Title -->
    <div class="mx-auto max-w-md px-6 pt-6">
        <div class="mb-6 flex items-center justify-between">
            <h2 class="text-3xl text-white">{course.title}</h2>
            <button
                class="rounded-full bg-white/80 px-6 py-2 text-sm font-medium text-gray-800 transition-all hover:scale-105 hover:bg-white active:scale-95"
                onclick={() => {
                    /* Handle join course */
                }}
            >
                {m.explore_join_course()}
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
                {course.description}
            </p>
        </div>

        <!-- Topics Section -->
        <div>
            <h3 class="mb-4 font-serif text-3xl font-bold text-white">
                {m.explore_topics()}
            </h3>
            <div class="space-y-3">
                {#each course.topics as topic}
                    <button
                        class="w-full rounded-2xl bg-white/10 px-5 py-4 text-left backdrop-blur-sm transition-all hover:bg-white/20 active:scale-[0.98]"
                        onclick={() => {
                            /* Handle topic click */
                        }}
                    >
                        <p class="text-base text-white">{topic}</p>
                    </button>
                {/each}
            </div>
        </div>
    </div>

    <!-- Bottom Navigation -->
    <BottomNav activeTab="explore" />
</div>
