<script lang="ts">
    import { onMount } from "svelte";
    import { api } from "$lib";
    import { m } from "$lib/paraglide/messages";
    import { getLocale, setLocale } from "$lib/paraglide/runtime";
    import { createSettingsState, formatDate } from "$lib/settings.svelte";
    import {
        getNextLocale,
        switchActiveMode,
    } from "$lib/features/settings/actions";
    import CosmicButton from "$lib/components/ui/CosmicButton.svelte";
    import BottomNav from "$lib/components/layout/student/BottomNav.svelte";
    import {
        User,
        Mail,
        Calendar,
        Wallet,
        CreditCard,
        ArrowRight,
        LoaderCircle,
        Pencil,
        X,
        Globe,
        LogOut,
    } from "@lucide/svelte";
    import { slide } from "svelte/transition";

    const s = createSettingsState();
    let switchingMode = $state(false);

    onMount(() => {
        document.documentElement.classList.add("dark");
    });

    async function handleSwitchToMentor() {
        if (switchingMode) return;
        switchingMode = true;
        try {
            const result = await switchActiveMode(api, "mentor");
            if (!result.success) {
                console.error("Failed to switch mode:", result.error);
            }
        } catch (error) {
            console.error("Failed to switch mode:", error);
        } finally {
            switchingMode = false;
        }
    }
</script>

<div
    class="selection:bg-brand-gold min-h-screen w-full overflow-x-hidden bg-linear-to-br from-[#404040] to-[#858585] pb-24 font-sans text-white selection:text-white"
>
    <main class="relative z-10 w-full">
        <div class="mx-auto max-w-md px-6 pt-8 md:max-w-2xl lg:max-w-4xl">
            <div class="mb-8 flex items-center justify-between">
                <h1 class="font-serif-tc text-3xl text-white md:text-4xl">
                    {m.settings_title()}
                </h1>

                <div class="flex items-center gap-3">
                    <button
                        class="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
                        onclick={() => {
                            setLocale(getNextLocale(getLocale()));
                        }}
                    >
                        <Globe class="h-3.5 w-3.5" />
                        <span class="tracking-wider uppercase">
                            {getLocale() === "en" ? "English" : "繁體中文"}
                        </span>
                    </button>
                </div>
            </div>

            {#if !s.user}
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
                                {#if s.user.photoURL}
                                    <img
                                        src={s.user.photoURL}
                                        alt="Profile"
                                        class="border-brand-gold/30 h-16 w-16 rounded-full border-2 object-cover"
                                    />
                                {:else}
                                    <div
                                        class="from-brand-gold to-brand-silver flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br font-serif text-2xl text-black"
                                    >
                                        {(
                                            s.user.displayName ||
                                            s.user.email ||
                                            "U"
                                        )
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
                                    {#if s.displayNameEditing}
                                        <div
                                            class="flex flex-wrap items-center gap-3"
                                        >
                                            <div
                                                class="focus-within:border-brand-gold/60 flex min-w-55 flex-1 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-white"
                                            >
                                                <User
                                                    class="text-text-secondary h-4 w-4 shrink-0"
                                                />
                                                <input
                                                    class="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                                                    placeholder={m.settings_display_name()}
                                                    bind:value={
                                                        s.displayNameDraft
                                                    }
                                                    bind:this={
                                                        s.displayNameInput
                                                    }
                                                    oninput={s.onDisplayNameInput}
                                                    onkeydown={s.handleDisplayNameKeydown}
                                                />
                                            </div>
                                            <CosmicButton
                                                variant="primary"
                                                onclick={s.saveDisplayName}
                                                disabled={!s.displayNameCanSave}
                                                className="px-5 py-3"
                                            >
                                                {#if s.displayNameSaving}
                                                    <LoaderCircle
                                                        class="h-4 w-4 animate-spin"
                                                    />
                                                    <span>{m.save()}</span>
                                                {:else}
                                                    <span>{m.save()}</span>
                                                {/if}
                                            </CosmicButton>
                                            <CosmicButton
                                                variant="secondary"
                                                onclick={s.cancelDisplayNameEdit}
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
                                                    {s.profile?.displayName ||
                                                        s.user.displayName ||
                                                        m.settings_not_set()}
                                                </span>
                                            </div>
                                            <button
                                                class="text-text-secondary flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 transition hover:border-white/30 hover:text-white"
                                                onclick={s.startDisplayNameEdit}
                                                aria-label="Edit display name"
                                            >
                                                <Pencil class="h-3 w-3" />
                                            </button>
                                        </div>
                                    {/if}
                                    {#if s.displayNameError}
                                        <p class="text-status-error text-xs">
                                            {s.displayNameError}
                                        </p>
                                    {/if}
                                </div>

                                <div>
                                    <div
                                        class="text-text-secondary mb-1 text-xs font-medium tracking-wider uppercase"
                                    >
                                        {m.settings_email()}
                                    </div>
                                    <div
                                        class="flex items-center gap-2 text-white"
                                    >
                                        <Mail
                                            class="text-text-secondary h-4 w-4 shrink-0"
                                        />
                                        <span
                                            class="break-all"
                                            style="font-size: clamp(0.45rem, 4.5cqw, 1rem)"
                                            >{s.user.email}</span
                                        >
                                    </div>
                                </div>

                                {#if s.profile?.createdAt}
                                    <div>
                                        <div
                                            class="text-text-secondary mb-1 text-xs font-medium tracking-wider uppercase"
                                        >
                                            {m.settings_member_since()}
                                        </div>
                                        <div
                                            class="flex items-center gap-2 text-white"
                                        >
                                            <Calendar
                                                class="text-text-secondary h-4 w-4 shrink-0"
                                            />
                                            <span
                                                style="font-size: clamp(0.45rem, 4.5cqw, 1rem)"
                                                >{formatDate(
                                                    s.profile.createdAt,
                                                )}</span
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
                                <p
                                    class="text-text-secondary text-sm font-light"
                                >
                                    {m.settings_credits_description()}
                                </p>
                            </div>
                            <Wallet
                                class="text-brand-gold h-8 w-8 opacity-60"
                            />
                        </div>

                        {#if s.walletLoading}
                            <div class="flex items-center justify-center py-8">
                                <LoaderCircle
                                    class="text-brand-gold h-8 w-8 animate-spin"
                                />
                            </div>
                        {:else if s.walletError}
                            <div class="py-6 text-center">
                                <p class="text-text-secondary font-light">
                                    {s.walletError === "Not authenticated"
                                        ? m.settings_sign_in_to_view()
                                        : s.walletError}
                                </p>
                            </div>
                        {:else if s.wallet}
                            <div
                                transition:slide
                                class="flex items-center gap-4"
                            >
                                <div class="flex items-center gap-3">
                                    <div
                                        class="bg-brand-gold/10 flex h-12 w-12 items-center justify-center rounded-full"
                                    >
                                        <CreditCard
                                            class="text-brand-gold h-6 w-6"
                                        />
                                    </div>
                                    <div>
                                        <div
                                            class="text-text-secondary text-xs font-medium tracking-wider uppercase"
                                        >
                                            {m.settings_balance()}
                                        </div>
                                        <div
                                            class="font-serif text-3xl text-white"
                                        >
                                            {s.wallet.balanceCredits.toLocaleString()}
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

                    <div
                        class="animate-slide-up rounded-3xl border border-white/10 bg-[#4C4C4C] p-6 backdrop-blur-md [animation-delay:100ms]"
                    >
                        <div
                            class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
                        >
                            <div>
                                <h2 class="mb-1 text-xl text-white">
                                    {m.settings_switch_to_mentor_title()}
                                </h2>
                                <p
                                    class="text-text-secondary text-sm font-light"
                                >
                                    {m.settings_switch_to_mentor_description()}
                                </p>
                            </div>
                            <button
                                class="inline-flex items-center justify-center rounded-full bg-[#F5F5F5] px-5 py-2 text-sm font-semibold text-black transition"
                                onclick={handleSwitchToMentor}
                                disabled={switchingMode}
                            >
                                {m.settings_switch_to_mentor_action()}
                            </button>
                        </div>
                    </div>

                    <div
                        class="animate-slide-up rounded-3xl border border-white/10 bg-[#4C4C4C] p-6 backdrop-blur-md [animation-delay:150ms]"
                    >
                        <div
                            class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
                        >
                            <div>
                                <h2 class="mb-1 text-xl text-white">
                                    {m.auth_sign_out()}
                                </h2>
                            </div>
                            <CosmicButton
                                variant="danger"
                                onclick={s.handleLogout}
                                disabled={s.loggingOut}
                                className="min-w-37.5"
                            >
                                {#if s.loggingOut}
                                    <LoaderCircle
                                        class="h-4 w-4 animate-spin"
                                    />
                                    <span>{m.auth_signing_out()}</span>
                                {:else}
                                    <LogOut class="h-4 w-4" />
                                    <span>{m.auth_sign_out()}</span>
                                {/if}
                            </CosmicButton>
                        </div>
                        {#if s.logoutError}
                            <p class="text-status-error mt-4 text-sm">
                                {s.logoutError}
                            </p>
                        {/if}
                    </div>

                    <!-- Preferences Section -->
                </div>
                <BottomNav activeTab="profile" />
            {/if}
        </div>
    </main>
</div>
