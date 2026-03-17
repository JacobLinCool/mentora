<script lang="ts">
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { m } from "$lib/paraglide/messages";
    let { activeTab = "home" } = $props();
</script>

<nav
    class="fixed right-0 bottom-0 left-0 z-50 border-t border-white/12 bg-[#4a4a4a] px-6 pb-[calc(env(safe-area-inset-bottom)+0.4rem)]"
>
    <div class="mx-auto grid max-w-sm grid-cols-3 gap-2 py-2 md:max-w-md">
        <button
            class="group relative flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl border border-transparent transition-all duration-200 {activeTab ===
            'explore'
                ? 'text-white'
                : 'text-white/45 hover:text-white/75'}"
            aria-label={m.bottom_nav_explore()}
            onclick={() => goto(resolve("/explore"))}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <circle cx="12" cy="12" r="10" />
                <polygon
                    points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
                />
            </svg>
        </button>
        <button
            class="group relative flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl border border-transparent transition-all duration-200 {activeTab ===
            'home'
                ? 'text-white'
                : 'text-white/45 hover:text-white/75'}"
            aria-label={m.bottom_nav_home()}
            onclick={() => goto(resolve("/dashboard"))}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
        </button>
        <button
            class="group relative flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl border border-transparent transition-all duration-200 {activeTab ===
            'profile'
                ? 'text-white'
                : 'text-white/45 hover:text-white/75'}"
            aria-label={m.bottom_nav_profile()}
            onclick={() => goto(resolve("/settings"))}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 1 0-16 0" />
            </svg>
        </button>
    </div>
</nav>
