<script lang="ts">
    import { api } from "$lib";
    import { m } from "$lib/paraglide/messages";
    import CosmicButton from "$lib/components/ui/CosmicButton.svelte";
    import BottomNav from "$lib/components/dashboard/BottomNav.svelte";
    import {
        User,
        Mail,
        Calendar,
        Wallet,
        CreditCard,
        ArrowRight,
        Loader2,
    } from "@lucide/svelte";
    import { slide } from "svelte/transition";

    const user = $derived(api.currentUser);
    const profile = $derived(api.currentUserProfile);

    // Wallet state
    let wallet = $state<{ balanceCredits: number } | null>(null);
    let walletLoading = $state(true);
    let walletError = $state<string | null>(null);

    $effect(() => {
        if (user) {
            loadWallet();
        } else {
            wallet = null;
            walletLoading = false;
        }
    });

    async function loadWallet() {
        walletLoading = true;
        walletError = null;
        try {
            const result = await api.wallets.getMine();
            if (result.success) {
                wallet = result.data;
            } else {
                walletError = result.error;
            }
        } catch (e) {
            walletError =
                e instanceof Error ? e.message : "Failed to load wallet";
        } finally {
            walletLoading = false;
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

{#if !user}
    <!-- Not logged in -->
    <div
        class="animate-slide-up rounded-3xl border border-white/10 bg-[#4C4C4C] p-6 text-center backdrop-blur-md"
    >
        <div class="py-8">
            <User
                class="text-text-secondary mx-auto mb-4 h-16 w-16 opacity-50"
            />
            <h2 class="mb-2 font-serif text-2xl text-white">
                {m.settings_sign_in_required()}
            </h2>
            <p class="text-text-secondary mb-6 font-light">
                {m.settings_sign_in_prompt()}
            </p>
            <CosmicButton href="/auth" variant="primary">
                <span>{m.settings_sign_in()}</span>
                <ArrowRight class="h-5 w-5" />
            </CosmicButton>
        </div>
    </div>
{:else}
    <div class="space-y-8 pb-24">
        <!-- Profile Section -->
        <div
            class="animate-slide-up rounded-3xl border border-white/10 bg-[#4C4C4C] p-6 backdrop-blur-md"
            style="container-type: inline-size"
        >
            <div class="mb-6 flex items-center justify-between">
                <div>
                    <h2 class="mb-1 text-xl text-white">
                        {m.settings_profile()}
                    </h2>
                </div>
            </div>

            <div class="flex items-start gap-3">
                <!-- Profile Photo -->
                <div class="shrink-0">
                    {#if user.photoURL}
                        <img
                            src={user.photoURL}
                            alt="Profile"
                            class="border-brand-gold/30 h-16 w-16 rounded-full border-2 object-cover"
                        />
                    {:else}
                        <div
                            class="from-brand-gold to-brand-silver flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br font-serif text-2xl text-black"
                        >
                            {(user.displayName || user.email || "U")
                                .charAt(0)
                                .toUpperCase()}
                        </div>
                    {/if}
                </div>

                <!-- Profile Info -->
                <div class="min-w-0 flex-1 space-y-4">
                    <div>
                        <div
                            class="text-text-secondary mb-1 text-xs font-medium tracking-wider uppercase"
                        >
                            {m.settings_display_name()}
                        </div>
                        <div class="flex items-center gap-2 text-white">
                            <User
                                class="text-text-secondary h-4 w-4 shrink-0"
                            />
                            <span
                                class="break-all"
                                style="font-size: clamp(0.45rem, 4.5cqw, 1rem)"
                                >{user.displayName ||
                                    profile?.displayName ||
                                    m.settings_not_set()}</span
                            >
                        </div>
                    </div>

                    <div>
                        <div
                            class="text-text-secondary mb-1 text-xs font-medium tracking-wider uppercase"
                        >
                            {m.settings_email()}
                        </div>
                        <div class="flex items-center gap-2 text-white">
                            <Mail
                                class="text-text-secondary h-4 w-4 shrink-0"
                            />
                            <span
                                class="break-all"
                                style="font-size: clamp(0.45rem, 4.5cqw, 1rem)"
                                >{user.email}</span
                            >
                        </div>
                    </div>

                    {#if profile?.createdAt}
                        <div>
                            <div
                                class="text-text-secondary mb-1 text-xs font-medium tracking-wider uppercase"
                            >
                                {m.settings_member_since()}
                            </div>
                            <div class="flex items-center gap-2 text-white">
                                <Calendar
                                    class="text-text-secondary h-4 w-4 shrink-0"
                                />
                                <span
                                    style="font-size: clamp(0.45rem, 4.5cqw, 1rem)"
                                    >{formatDate(profile.createdAt)}</span
                                >
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Credits Section -->
        <div
            class="animate-slide-up rounded-3xl border border-white/10 bg-[#4C4C4C] p-6 backdrop-blur-md [animation-delay:100ms]"
        >
            <div class="mb-6 flex items-center justify-between">
                <div>
                    <h2 class="mb-1 text-xl text-white">
                        {m.settings_credits()}
                    </h2>
                    <p class="text-text-secondary text-sm font-light">
                        {m.settings_credits_description()}
                    </p>
                </div>
                <Wallet class="text-brand-gold h-8 w-8 opacity-60" />
            </div>

            {#if walletLoading}
                <div class="flex items-center justify-center py-8">
                    <Loader2 class="text-brand-gold h-8 w-8 animate-spin" />
                </div>
            {:else if walletError}
                <div class="py-6 text-center">
                    <p class="text-text-secondary font-light">
                        {walletError === "Not authenticated"
                            ? m.settings_sign_in_to_view()
                            : walletError}
                    </p>
                </div>
            {:else if wallet}
                <div transition:slide class="flex items-center gap-4">
                    <div class="flex items-center gap-3">
                        <div
                            class="bg-brand-gold/10 flex h-12 w-12 items-center justify-center rounded-full"
                        >
                            <CreditCard class="text-brand-gold h-6 w-6" />
                        </div>
                        <div>
                            <div
                                class="text-text-secondary text-xs font-medium tracking-wider uppercase"
                            >
                                {m.settings_balance()}
                            </div>
                            <div class="font-serif text-3xl text-white">
                                {wallet.balanceCredits.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            {:else}
                <div class="py-6 text-center">
                    <p class="text-text-secondary font-light">
                        {m.settings_no_wallet()}
                    </p>
                </div>
            {/if}
        </div>
    </div>
    <BottomNav activeTab="profile" />
{/if}
