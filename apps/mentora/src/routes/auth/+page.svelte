<script lang="ts">
    import { signOut } from "firebase/auth";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { auth } from "$lib/firebase";
    import { api } from "$lib";
    import BaseLayout from "$lib/components/layout/BaseLayout.svelte";
    import GlassCard from "$lib/components/ui/GlassCard.svelte";
    import LoginCard from "$lib/components/auth/LoginCard.svelte";
    import CosmicButton from "$lib/components/ui/CosmicButton.svelte";
    import { LogOut, User, Mail, Calendar } from "@lucide/svelte";

    let loggingOut = $state(false);

    const user = $derived(api.currentUser);
    const profile = $derived(api.currentUserProfile);

    async function handleLogout() {
        loggingOut = true;
        try {
            await signOut(auth);

            await goto(resolve("/"), { invalidateAll: true });
        } catch (e) {
            console.error("Logout failed:", e);
        } finally {
            loggingOut = false;
        }
    }

    function formatDate(timestamp: number | undefined) {
        if (!timestamp) return "Unknown";
        return new Date(timestamp).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }
</script>

<BaseLayout>
    <div
        class="container mx-auto flex min-h-[calc(100vh-100px)] items-center justify-center px-4"
    >
        <div class="w-full max-w-md">
            <div class="mb-10 text-center">
                <h1
                    class="to-brand-silver mb-4 bg-linear-to-br from-white bg-clip-text font-serif text-5xl text-transparent"
                >
                    Mentora
                </h1>
                <p class="text-text-secondary text-lg font-light tracking-wide">
                    {#if user}
                        Your Cosmic Identity
                    {:else}
                        Enter the Cosmic Intellect.
                    {/if}
                </p>
            </div>

            {#if user}
                <!-- Logged In: Profile View -->
                <GlassCard className="border-t border-t-white/20">
                    <div class="flex flex-col items-center gap-6">
                        <!-- Profile Photo -->
                        <div class="relative">
                            {#if user.photoURL}
                                <img
                                    src={user.photoURL}
                                    alt="Profile"
                                    class="border-brand-gold/30 h-24 w-24 rounded-full border-2 object-cover"
                                />
                            {:else}
                                <div
                                    class="from-brand-gold to-brand-silver flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br font-serif text-3xl text-black"
                                >
                                    {(user.displayName || user.email || "U")
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>
                            {/if}
                            <div
                                class="bg-status-success absolute right-1 bottom-1 h-4 w-4 rounded-full border-2 border-black"
                            ></div>
                        </div>

                        <!-- User Info -->
                        <div class="w-full space-y-4 text-center">
                            <h2 class="font-serif text-2xl text-white">
                                {user.displayName || "Scholar"}
                            </h2>

                            <div class="space-y-3">
                                <div
                                    class="text-text-secondary flex items-center justify-center gap-2 text-sm"
                                >
                                    <Mail class="h-4 w-4" />
                                    <span>{user.email}</span>
                                </div>

                                {#if profile?.createdAt}
                                    <div
                                        class="text-text-secondary flex items-center justify-center gap-2 text-sm"
                                    >
                                        <Calendar class="h-4 w-4" />
                                        <span
                                            >Joined {formatDate(
                                                profile.createdAt,
                                            )}</span
                                        >
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="mt-4 w-full space-y-3">
                            <CosmicButton
                                href="/"
                                variant="secondary"
                                className="w-full justify-center"
                            >
                                <User class="h-5 w-5" />
                                <span>Go to Dashboard</span>
                            </CosmicButton>

                            <CosmicButton
                                variant="primary"
                                className="w-full justify-center"
                                onclick={handleLogout}
                                disabled={loggingOut}
                            >
                                <LogOut class="h-5 w-5" />
                                <span
                                    >{loggingOut
                                        ? "Signing out..."
                                        : "Sign Out"}</span
                                >
                            </CosmicButton>
                        </div>
                    </div>
                </GlassCard>
            {:else}
                <!-- Logged Out: Login View -->
                <LoginCard />
            {/if}
        </div>
    </div>
</BaseLayout>
