<script lang="ts">
    import BottomNav from "$lib/components/dashboard/BottomNav.svelte";
    import ExploreCard from "$lib/components/explore/ExploreCard.svelte";
    import { m } from "$lib/paraglide/messages";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";

    interface Course {
        id: string;
        title: string;
        code: string;
        ownerId: string;
        visibility: string;
        theme: string;
        description: string | null;
        thumbnail: { storagePath: string; url: string } | null;
        createdAt: number;
        updatedAt: number;
        category: string;
    }

    // Mock Data aligned with CourseDoc schema
    const allCourses: Course[] = [
        {
            id: "course01",
            title: "course01",
            code: "COURSE01",
            ownerId: "mock-owner-1",
            visibility: "public",
            theme: "Psychology",
            description: null,
            thumbnail: {
                storagePath: "",
                url: "https://upload.wikimedia.org/wikipedia/en/6/66/Teletubbies_logo.png",
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            category: "Psychology",
        },
        {
            id: "course02",
            title: "course02",
            code: "COURSE02",
            ownerId: "mock-owner-1",
            visibility: "public",
            theme: "History",
            description: null,
            thumbnail: {
                storagePath: "",
                url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Stick_Figure.svg/1200px-Stick_Figure.svg.png",
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            category: "History",
        },
        {
            id: "course03",
            title: "course03",
            code: "COURSE03",
            ownerId: "mock-owner-1",
            visibility: "public",
            theme: "Logic",
            description: null,
            thumbnail: {
                storagePath: "",
                url: "/course-placeholder.jpg",
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            category: "Logic",
        },
    ];

    let searchQuery = $state("");
    let selectedCategory = $state("All");

    // Mapping internal category keys to translation functions
    const categoryMap: Record<string, () => string> = {
        All: m.explore_category_all,
        Logic: m.explore_category_logic,
        Psychology: m.explore_category_psychology,
        History: m.explore_category_history,
        Thinking: m.explore_category_thinking,
    };

    const categories = Object.keys(categoryMap);

    // Filtered courses
    let filteredCourses = $derived(
        allCourses.filter((course) => {
            const matchesSearch =
                course.title
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                course.category
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase());
            const matchesCategory =
                selectedCategory === "All" ||
                course.category === selectedCategory;
            return matchesSearch && matchesCategory;
        }),
    );

    function handleCourseClick(id: string): void {
        goto(resolve(`/explore/${id}`));
    }
</script>

<svelte:head>
    <title>{m.explore_title()} - Mentora</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-[#404040] to-[#858585] pb-24">
    <div class="mx-auto max-w-md px-6 pt-12 md:max-w-2xl lg:max-w-4xl">
        <!-- Header -->
        <h1 class="mb-8 font-serif text-5xl text-white">{m.explore_title()}</h1>

        <!-- Search Bar -->
        <div class="relative mb-6">
            <div
                class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"
            >
                <svg
                    class="h-5 w-5 text-gray-300"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
            </div>
            <input
                type="text"
                bind:value={searchQuery}
                placeholder={m.explore_search_placeholder()}
                class="w-full rounded-full bg-white/20 py-3 pr-4 pl-12 text-white placeholder-gray-300 backdrop-blur-sm focus:bg-white/30 focus:ring-2 focus:ring-white/50 focus:outline-none"
            />
        </div>

        <!-- Category Pills -->
        <div class="no-scrollbar mb-8 flex space-x-3 overflow-x-auto pb-2">
            {#each categories as category (category)}
                <button
                    class="rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors {selectedCategory ===
                    category
                        ? 'bg-white text-gray-800'
                        : 'bg-white/20 text-white hover:bg-white/30'}"
                    onclick={() => (selectedCategory = category)}
                >
                    {categoryMap[category]()}
                </button>
            {/each}
        </div>

        <!-- Course List -->
        <div class="grid gap-6 md:grid-cols-2">
            {#each filteredCourses as course (course.id)}
                <ExploreCard
                    title={course.title}
                    category={categoryMap[course.category]
                        ? categoryMap[course.category]()
                        : course.category}
                    imageUrl={course.thumbnail?.url ??
                        "/course-placeholder.jpg"}
                    onclick={() => handleCourseClick(course.id)}
                />
            {/each}
        </div>
    </div>

    <BottomNav activeTab="explore" />
</div>

<style>
    /* Hide scrollbar for Chrome, Safari and Opera */
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }

    /* Hide scrollbar for IE, Edge and Firefox */
    .no-scrollbar {
        -ms-overflow-style: none; /* IE and Edge */
        scrollbar-width: none; /* Firefox */
    }
</style>
