<script lang="ts">
    import { onMount } from "svelte";
    import { resolve } from "$app/paths";
    import { api } from "$lib";

    let { children } = $props();

    const user = $derived(api.currentUser);

    // Force dark mode for Flowbite
    onMount(() => {
        document.documentElement.classList.add("dark");
    });

    function getInitials(
        name: string | null | undefined,
        email: string | null | undefined,
    ): string {
        if (name) {
            return name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
        }
        if (email) {
            return email.charAt(0).toUpperCase();
        }
        return "U";
    }
</script>

<div
    class="bg-canvas-deep text-text-primary selection:bg-brand-gold selection:text-canvas-deep dark relative min-h-screen w-full overflow-x-hidden font-sans"
>
    <!-- Living Backdrop -->
    <div class="pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
        <!-- Gradient Base -->
        <div
            class="from-canvas-deep to-canvas-accent absolute inset-0 bg-linear-to-br opacity-90"
        ></div>

        <!-- Floating Orbs -->
        <div
            class="animate-float-delayed absolute -top-[100px] -left-[100px] h-[500px] w-[500px] rounded-full bg-indigo-500/15 blur-[80px]"
        ></div>
        <div
            class="bg-brand-gold/5 animate-float absolute -right-[100px] -bottom-[100px] h-[500px] w-[500px] rounded-full blur-[80px]"
        ></div>
    </div>

    <!-- Global Navigation -->
    <nav class="fixed top-0 right-0 left-0 z-50 px-6 py-4">
        <div class="mx-auto max-w-7xl">
            <div
                class="bg-glass-surface border-glass-border flex items-center justify-between rounded-2xl border px-6 py-3 shadow-lg backdrop-blur-[20px]"
            >
                <!-- Logo -->
                <a href={resolve("/")} class="group flex items-center gap-3">
                    <div
                        class="from-brand-gold to-brand-silver animate-spin-slow h-8 w-8 rounded-full bg-linear-to-br opacity-80 transition-opacity group-hover:opacity-100"
                    ></div>
                    <span
                        class="bg-background-image-metallic bg-clip-text font-serif text-xl font-bold tracking-tight text-transparent"
                        >Mentora</span
                    >
                </a>

                <!-- Links -->
                <div class="hidden items-center gap-8 md:flex">
                    <a
                        href={resolve("/")}
                        class="text-text-secondary text-sm font-medium transition-colors hover:text-white"
                        >Dashboard</a
                    >
                    <a
                        href={resolve("/courses")}
                        class="text-text-secondary text-sm font-medium transition-colors hover:text-white"
                        >Courses</a
                    >
                    <a
                        href={resolve("/settings")}
                        class="text-text-secondary text-sm font-medium transition-colors hover:text-white"
                        >Settings</a
                    >
                </div>

                <!-- Profile / Actions -->
                <div class="flex items-center gap-4">
                    {#if user}
                        <a
                            href={resolve("/auth")}
                            class="text-text-secondary text-xs font-medium tracking-wider uppercase hover:text-white"
                            >{user.displayName ||
                                user.email?.split("@")[0] ||
                                "Account"}</a
                        >
                        {#if user.photoURL}
                            <a href={resolve("/auth")}>
                                <img
                                    src={user.photoURL}
                                    alt="Profile"
                                    class="h-8 w-8 rounded-full border border-white/20 object-cover"
                                />
                            </a>
                        {:else}
                            <a
                                href={resolve("/auth")}
                                class="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 font-serif text-xs"
                            >
                                {getInitials(user.displayName, user.email)}
                            </a>
                        {/if}
                    {:else}
                        <a
                            href={resolve("/auth")}
                            class="text-brand-gold text-xs font-medium tracking-wider uppercase hover:text-white"
                            >Sign In</a
                        >
                    {/if}
                </div>
            </div>
        </div>
    </nav>

    <!-- Content Slot -->
    <main class="relative z-10 w-full pt-28">
        {@render children?.()}
    </main>
</div>
