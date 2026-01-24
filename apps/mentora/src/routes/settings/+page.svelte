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
        Pencil,
        X,
    } from "@lucide/svelte";
    import { tick } from "svelte";
    import { slide } from "svelte/transition";

    const user = $derived(api.currentUser);
    const profile = $derived(api.currentUserProfile);

    const displayNameInitial = $derived(
        (profile?.displayName ?? user?.displayName ?? "").trim(),
    );
    let displayNameDraft = $state("");
    let displayNameDirty = $state(false);
    let displayNameSaving = $state(false);
    let displayNameError = $state<string | null>(null);
    let displayNameEditing = $state(false);
    let displayNameInput = $state<HTMLInputElement | null>(null);

    const displayNameCanSave = $derived(
        !displayNameSaving && displayNameDraft.trim().length > 0,
    );

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

    $effect(() => {
        if (!displayNameDirty && !displayNameSaving && !displayNameEditing) {
            displayNameDraft = displayNameInitial;
            displayNameError = null;
        }
    });

    $effect(() => {
        if (displayNameEditing) {
            tick().then(() => {
                displayNameInput?.focus();
                displayNameInput?.select();
            });
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

    async function saveDisplayName() {
        if (!displayNameCanSave) return;

        // If no change, just exit edit mode
        if (displayNameDraft.trim() === displayNameInitial) {
            cancelDisplayNameEdit();
            return;
        }

        displayNameSaving = true;
        displayNameError = null;

        const result = await api.users.updateMyProfile({
            displayName: displayNameDraft.trim(),
        });

        if (!result.success) {
            displayNameError = result.error;
            displayNameSaving = false;
            return;
        }

        displayNameEditing = false;
        displayNameDirty = false;
        displayNameSaving = false;
    }

    function startDisplayNameEdit() {
        displayNameDraft = displayNameInitial;
        displayNameDirty = false;
        displayNameError = null;
        displayNameEditing = true;
    }

    function cancelDisplayNameEdit() {
        displayNameEditing = false;
        displayNameDirty = false;
        displayNameDraft = displayNameInitial;
        displayNameError = null;
    }

    function handleDisplayNameKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            saveDisplayName();
        }
        if (event.key === "Escape") {
            event.preventDefault();
            cancelDisplayNameEdit();
        }
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
                    <div class="space-y-2">
                        <div
                            class="text-text-secondary text-xs font-medium tracking-wider uppercase"
                        >
                            {m.settings_display_name()}
                        </div>
                        {#if displayNameEditing}
                            <div class="flex flex-wrap items-center gap-3">
                                <div
                                    class="focus-within:border-brand-gold/60 flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-white"
                                >
                                    <User
                                        class="text-text-secondary h-4 w-4 shrink-0"
                                    />
                                    <input
                                        class="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                                        placeholder={m.settings_display_name()}
                                        bind:value={displayNameDraft}
                                        bind:this={displayNameInput}
                                        oninput={() => {
                                            displayNameDirty = true;
                                            displayNameError = null;
                                        }}
                                        onkeydown={handleDisplayNameKeydown}
                                    />
                                </div>
                                <CosmicButton
                                    variant="primary"
                                    onclick={saveDisplayName}
                                    disabled={!displayNameCanSave}
                                    className="px-5 py-3"
                                >
                                    {#if displayNameSaving}
                                        <Loader2 class="h-4 w-4 animate-spin" />
                                        <span>{m.save()}</span>
                                    {:else}
                                        <span>{m.save()}</span>
                                    {/if}
                                </CosmicButton>
                                <CosmicButton
                                    variant="secondary"
                                    onclick={cancelDisplayNameEdit}
                                    className="px-4 py-3"
                                >
                                    <X class="h-4 w-4" />
                                    <span>{m.cancel()}</span>
                                </CosmicButton>
                            </div>
                        {:else}
                            <div class="flex items-center gap-3">
                                <div
                                    class="flex min-w-0 flex-1 items-center gap-2 text-white"
                                >
                                    <User
                                        class="text-text-secondary h-4 w-4 shrink-0"
                                    />
                                    <span
                                        class="truncate"
                                        style="font-size: clamp(0.45rem, 4.5cqw, 1rem)"
                                    >
                                        {profile?.displayName ||
                                            user.displayName ||
                                            m.settings_not_set()}
                                    </span>
                                </div>
                                <button
                                    class="text-text-secondary flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 transition hover:border-white/30 hover:text-white"
                                    onclick={startDisplayNameEdit}
                                    aria-label="Edit display name"
                                >
                                    <Pencil class="h-3 w-3" />
                                </button>
                            </div>
                        {/if}
                        {#if displayNameError}
                            <p class="text-status-error text-xs">
                                {displayNameError}
                            </p>
                        {/if}
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
