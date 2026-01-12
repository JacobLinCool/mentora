<script>
    let { activeTab = "home" } = $props();
</script>

<nav
    class="bg-canvas-accent border-glass-border fixed right-0 bottom-0 left-0 border-t px-6 py-3"
>
    <div class="mx-auto flex max-w-md items-center justify-around">
        <button
            class="flex flex-col items-center transition-colors {activeTab ===
            'explore'
                ? 'text-white'
                : 'text-text-secondary'}"
            onclick={() => (window.location.href = "/explore")}
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
            class="flex flex-col items-center transition-colors {activeTab ===
            'home'
                ? 'text-white'
                : 'text-text-secondary'}"
            onclick={() => (window.location.href = "/dashboard")}
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
            class="flex flex-col items-center transition-colors {activeTab ===
            'profile'
                ? 'text-white'
                : 'text-text-secondary'}"
            onclick={() => (window.location.href = "/profile")}
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
