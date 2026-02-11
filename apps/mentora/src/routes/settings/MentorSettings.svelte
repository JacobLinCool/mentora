<script lang="ts">
    import { api } from "$lib";
    import { m } from "$lib/paraglide/messages";
    import { setMentorMode } from "$lib/temp.svelte";
    import MentorLayout from "$lib/components/layout/mentor/MentorLayout.svelte";
    import { getLocale, setLocale } from "$lib/paraglide/runtime";
    import { tick } from "svelte";
    import {
        User,
        Mail,
        Calendar,
        Settings,
        ArrowRight,
        Globe,
        Wallet,
        CreditCard,
        Loader2,
    } from "@lucide/svelte";
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
        if (!timestamp) return m.unknown();
        return new Date(timestamp).toLocaleDateString(getLocale(), {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

    async function saveDisplayName() {
        if (!displayNameCanSave) return;

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

<svelte:head>
    <title>{m.settings_title()} | {m.app_name()}</title>
</svelte:head>

<MentorLayout>
    <div class="mx-auto max-w-5xl px-8 pt-12 pb-24">
        <div class="mb-12 flex items-center justify-between">
            <div>
                <h1 class="font-serif-tc text-4xl font-bold tracking-tight">
                    {m.settings_title()}
                </h1>
            </div>

            <!-- Buttons moved to Preferences card -->
        </div>

        {#if !user}
            <div class="rounded-xl bg-white p-8 shadow-sm">
                <div
                    class="mx-auto flex max-w-md flex-col items-center text-center"
                >
                    <div class="mb-4 rounded-full bg-[#F5F5F5] p-3">
                        <User class="h-6 w-6 text-gray-600" />
                    </div>
                    <h2 class="text-xl font-medium text-black">
                        {m.settings_sign_in_required()}
                    </h2>
                    <p class="mt-2 text-sm text-gray-600">
                        {m.settings_sign_in_prompt()}
                    </p>
                    <a
                        href="/auth"
                        class="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                    >
                        {m.settings_sign_in()}
                        <ArrowRight class="h-4 w-4" />
                    </a>
                </div>
            </div>
        {:else}
            <div class="grid gap-8 md:grid-cols-[1.5fr_1fr]">
                <!-- Profile Section -->
                <div>
                    <h2 class="mb-4 text-xl font-normal text-black">
                        {m.settings_profile()}
                    </h2>
                    <section class="rounded-xl bg-white p-6 shadow-sm">
                        <div
                            class="mb-6 flex items-center justify-between border-b border-gray-100 pb-4"
                        >
                            <div class="flex items-center gap-4">
                                {#if user.photoURL}
                                    <img
                                        src={user.photoURL}
                                        alt="Profile"
                                        class="h-16 w-16 rounded-full object-cover shadow-sm"
                                    />
                                {:else}
                                    <div
                                        class="flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F5F5] text-xl font-semibold text-gray-700"
                                    >
                                        {(user.displayName || user.email || "U")
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>
                                {/if}
                                <div>
                                    <h3
                                        class="text-lg font-medium text-gray-900"
                                    >
                                        {profile?.displayName ||
                                            user.displayName ||
                                            m.settings_not_set()}
                                    </h3>
                                    <p class="text-sm text-gray-500">
                                        {user.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                class="cursor-pointer text-sm font-medium text-gray-500 transition-colors hover:text-black"
                                onclick={startDisplayNameEdit}
                                aria-label={m.edit()}
                            >
                                {m.edit()}
                            </button>
                        </div>

                        <div class="space-y-6">
                            <div>
                                <div
                                    class="text-xs font-medium tracking-wider text-gray-400 uppercase"
                                >
                                    {m.settings_display_name()}
                                </div>
                                {#if displayNameEditing}
                                    <div class="mt-2 space-y-3">
                                        <div
                                            class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"
                                        >
                                            <User
                                                class="h-4 w-4 text-gray-400"
                                            />
                                            <input
                                                class="w-full text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
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
                                        <div class="flex items-center gap-3">
                                            <button
                                                class="cursor-pointer rounded-full bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
                                                onclick={saveDisplayName}
                                                disabled={!displayNameCanSave}
                                            >
                                                {displayNameSaving
                                                    ? m.saving()
                                                    : m.save()}
                                            </button>
                                            <button
                                                class="cursor-pointer rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-black"
                                                onclick={cancelDisplayNameEdit}
                                            >
                                                {m.cancel()}
                                            </button>
                                        </div>
                                        {#if displayNameError}
                                            <p class="text-xs text-red-500">
                                                {displayNameError}
                                            </p>
                                        {/if}
                                    </div>
                                {:else}
                                    <div
                                        class="mt-1 flex items-center gap-2 text-sm text-gray-900"
                                    >
                                        <User class="h-4 w-4 text-gray-400" />
                                        <span>
                                            {profile?.displayName ||
                                                user.displayName ||
                                                m.settings_not_set()}
                                        </span>
                                    </div>
                                {/if}
                            </div>
                            <div>
                                <div
                                    class="text-xs font-medium tracking-wider text-gray-400 uppercase"
                                >
                                    {m.settings_email()}
                                </div>
                                <div
                                    class="mt-1 flex items-center gap-2 text-sm text-gray-900"
                                >
                                    <Mail class="h-4 w-4 text-gray-400" />
                                    <span class="break-all">{user.email}</span>
                                </div>
                            </div>
                            {#if profile?.createdAt}
                                <div>
                                    <div
                                        class="text-xs font-medium tracking-wider text-gray-400 uppercase"
                                    >
                                        {m.settings_member_since()}
                                    </div>
                                    <div
                                        class="mt-1 flex items-center gap-2 text-sm text-gray-900"
                                    >
                                        <Calendar
                                            class="h-4 w-4 text-gray-400"
                                        />
                                        <span
                                            >{formatDate(
                                                profile.createdAt,
                                            )}</span
                                        >
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </section>
                </div>

                <!-- Credits Section -->
                <div>
                    <h2 class="mb-4 text-xl font-normal text-black">
                        {m.settings_credits()}
                    </h2>
                    <section class="rounded-xl bg-white p-6 shadow-sm">
                        <div class="mb-6 flex items-center justify-between">
                            <p class="text-sm text-gray-600">
                                {m.settings_credits_description()}
                            </p>
                            <Wallet class="h-8 w-8 text-gray-400" />
                        </div>

                        {#if walletLoading}
                            <div class="flex items-center justify-center py-8">
                                <Loader2
                                    class="h-8 w-8 animate-spin text-gray-400"
                                />
                            </div>
                        {:else if walletError}
                            <div class="py-6 text-center">
                                <p class="font-light text-gray-500">
                                    {walletError === "Not authenticated"
                                        ? m.settings_sign_in_to_view()
                                        : walletError}
                                </p>
                            </div>
                        {:else if wallet}
                            <div
                                transition:slide
                                class="flex items-center gap-4"
                            >
                                <div class="flex items-center gap-3">
                                    <div
                                        class="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-50"
                                    >
                                        <CreditCard
                                            class="h-6 w-6 text-yellow-600"
                                        />
                                    </div>
                                    <div>
                                        <div
                                            class="text-xs font-medium tracking-wider text-gray-500 uppercase"
                                        >
                                            {m.settings_balance()}
                                        </div>
                                        <div
                                            class="font-serif-tc text-3xl text-gray-900"
                                        >
                                            {wallet.balanceCredits.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {:else}
                            <div class="py-6 text-center">
                                <p class="font-light text-gray-500">
                                    {m.settings_no_wallet()}
                                </p>
                            </div>
                        {/if}
                    </section>

                    <!-- Preferences Section -->
                    <div class="mt-8">
                        <h2 class="mb-4 text-xl font-normal text-black">
                            {m.settings_preferences()}
                        </h2>
                        <section class="rounded-xl bg-white p-6 shadow-sm">
                            <div class="space-y-4">
                                <button
                                    class="flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-100 p-4 transition hover:border-gray-300 hover:bg-gray-50"
                                    onclick={() => setMentorMode(false)}
                                >
                                    <span
                                        class="text-sm font-medium text-gray-900"
                                    >
                                        {m.settings_switch_to_student()}
                                    </span>
                                    <div
                                        class="rounded-full bg-gray-100 p-1 text-gray-400"
                                    >
                                        <ArrowRight class="h-4 w-4" />
                                    </div>
                                </button>

                                <button
                                    class="flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-100 p-4 transition hover:border-gray-300 hover:bg-gray-50"
                                    onclick={() => {
                                        const current = getLocale();
                                        const next =
                                            current === "en" ? "zh-tw" : "en";
                                        setLocale(next);
                                    }}
                                >
                                    <div class="flex items-center gap-3">
                                        <Globe class="h-5 w-5 text-gray-400" />
                                        <span
                                            class="text-sm font-medium text-gray-900"
                                        >
                                            {getLocale() === "en"
                                                ? "English"
                                                : "繁體中文"}
                                        </span>
                                    </div>
                                    <div
                                        class="text-xs font-medium text-gray-500"
                                    >
                                        {getLocale() === "en"
                                            ? "Switch to Chinese"
                                            : "Switch to English"}
                                    </div>
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</MentorLayout>
