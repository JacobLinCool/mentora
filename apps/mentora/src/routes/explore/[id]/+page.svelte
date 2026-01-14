<script lang="ts">
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { m } from "$lib/paraglide/messages";
    import BottomNav from "$lib/components/dashboard/BottomNav.svelte";

    // Types aligned with CourseDoc schema
    type CourseVisibility = "public" | "unlisted" | "private";

    interface MockCourse {
        id: string;
        title: string;
        code: string;
        ownerId: string;
        visibility: CourseVisibility;
        passwordHash: string | null;
        description: string | null;
        theme: string | null;
        thumbnail: { storagePath: string; url: string | null } | null;
        createdAt: number;
        updatedAt: number;
        // UI-only field for demo (topics should be loaded from api.topics.listForCourse in production)
        topics: string[];
    }

    // Mock course data - aligned with CourseDoc schema
    const courseData: Record<string, MockCourse> = {
        course01: {
            id: "course01",
            title: m.explore_intro(),
            code: "COURSE01",
            ownerId: "mock-owner-1",
            visibility: "private",
            passwordHash: "test123",
            thumbnail: {
                storagePath: "",
                url: "https://upload.wikimedia.org/wikipedia/en/6/66/Teletubbies_logo.png",
            },
            theme: "Psychology",
            description:
                "這是一堂非常好的課，因為每個人都可以拿到A+。\n這是一堂非常好的課，因為每個人都可以拿到A+。\n這是一堂非常好的課，因為每個人都可以拿到A+。",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            topics: [
                "高中生去學校要不要帶手機",
                "高中生去學校要不要帶手機",
                "高中生去學校要不要帶手機",
                "高中生去學校要不要帶手機",
            ],
        },
        course02: {
            id: "course02",
            title: m.explore_intro(),
            code: "COURSE02",
            ownerId: "mock-owner-1",
            visibility: "private",
            passwordHash: "demo456",
            thumbnail: {
                storagePath: "",
                url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Stick_Figure.svg/1200px-Stick_Figure.svg.png",
            },
            theme: "History",
            description:
                "這是一堂非常好的課，因為每個人都可以拿到A+。\n這是一堂非常好的課，因為每個人都可以拿到A+。\n這是一堂非常好的課，因為每個人都可以拿到A+。",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            topics: [
                "探索歷史的意義",
                "歷史人物分析",
                "重要歷史事件",
                "歷史與現代社會",
            ],
        },
        course03: {
            id: "course03",
            title: m.explore_intro(),
            code: "COURSE03",
            ownerId: "mock-owner-1",
            visibility: "public",
            passwordHash: null,
            thumbnail: {
                storagePath: "",
                url: "/course-placeholder.jpg",
            },
            theme: "Logic",
            description:
                "這是一堂非常好的課，因為每個人都可以拿到A+。\n這是一堂非常好的課，因為每個人都可以拿到A+。\n這是一堂非常好的課，因為每個人都可以拿到A+。",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            topics: ["邏輯推理基礎", "批判性思考", "論證分析", "邏輯謬誤識別"],
        },
    };

    // Get the course data based on the ID from the URL
    const course =
        courseData[page.params.id as keyof typeof courseData] ??
        courseData.course01;

    // State for join/enter course flow
    let isJoined = $state(false);
    let showPasswordModal = $state(false);
    let passwordInput = $state("");
    let passwordError = $state(false);

    // Handlers
    function handleJoinClick() {
        if (isJoined) {
            // Navigate to course page
            goto(`/courses/${course.id}`);
        } else if (course.visibility === "private" && course.passwordHash) {
            // Show password modal for private courses
            showPasswordModal = true;
            passwordInput = "";
            passwordError = false;
        } else {
            // Public course - join immediately
            isJoined = true;
        }
    }

    function handlePasswordSubmit() {
        if (passwordInput === course.passwordHash) {
            // Password correct
            isJoined = true;
            showPasswordModal = false;
            passwordInput = "";
            passwordError = false;
        } else {
            // Password incorrect
            passwordError = true;
        }
    }

    function handlePasswordCancel() {
        showPasswordModal = false;
        passwordInput = "";
        passwordError = false;
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            handlePasswordSubmit();
        } else if (event.key === "Escape") {
            handlePasswordCancel();
        }
    }
</script>

<svelte:head>
    <title>{course.code} - {m.explore_title()} - Mentora</title>
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
                class="cursor-pointer rounded-full px-6 py-2 text-sm font-medium transition-all hover:scale-105 active:scale-95 {isJoined
                    ? 'bg-emerald-500/90 text-white hover:bg-emerald-500'
                    : 'bg-white/80 text-gray-800 hover:bg-white'}"
                onclick={handleJoinClick}
            >
                {isJoined ? m.explore_enter_course() : m.explore_join_course()}
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
                        class="w-full cursor-pointer rounded-2xl bg-white/10 px-5 py-4 text-left backdrop-blur-sm transition-all hover:bg-white/20 active:scale-[0.98]"
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

<!-- Password Modal -->
{#if showPasswordModal}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onclick={handlePasswordCancel}
        onkeydown={handleKeydown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-modal-title"
    >
        <!-- Modal Content -->
        <div
            class="mx-4 w-full max-w-sm rounded-2xl border border-white/20 bg-[#3a3a3a]/95 p-6 shadow-2xl backdrop-blur-xl"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
            role="document"
        >
            <h3
                id="password-modal-title"
                class="mb-4 text-center text-xl font-semibold text-white"
            >
                {m.explore_password_modal_title()}
            </h3>

            <!-- Password Input -->
            <div class="mb-4">
                <input
                    type="password"
                    bind:value={passwordInput}
                    placeholder={m.explore_password_placeholder()}
                    class="w-full rounded-xl border bg-white/10 px-4 py-3 text-white placeholder-white/50 transition-all focus:ring-2 focus:outline-none {passwordError
                        ? 'border-red-500/50 focus:ring-red-500/50'
                        : 'border-white/20 focus:ring-white/30'}"
                    onkeydown={handleKeydown}
                />
                {#if passwordError}
                    <p class="mt-2 text-sm text-red-400">
                        {m.explore_password_error()}
                    </p>
                {/if}
            </div>

            <!-- Buttons -->
            <div class="flex gap-3">
                <button
                    class="flex-1 cursor-pointer rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/20 active:scale-95"
                    onclick={handlePasswordCancel}
                >
                    {m.explore_password_cancel()}
                </button>
                <button
                    class="flex-1 cursor-pointer rounded-xl bg-white/90 px-4 py-3 text-sm font-medium text-gray-800 transition-all hover:bg-white active:scale-95"
                    onclick={handlePasswordSubmit}
                >
                    {m.explore_password_submit()}
                </button>
            </div>
        </div>
    </div>
{/if}
