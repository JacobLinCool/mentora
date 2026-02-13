<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { setMentorMode } from "$lib/temp.svelte";
    import { createSettingsState, formatDate } from "$lib/settings.svelte";
    import MentorLayout from "$lib/components/layout/mentor/MentorLayout.svelte";
    import { resolve } from "$app/paths";
    import { getLocale, setLocale } from "$lib/paraglide/runtime";
    import {
        User,
        Mail,
        Calendar,
        ArrowRight,
        Globe,
        Wallet,
        CreditCard,
        Loader2,
        LogOut,
    } from "@lucide/svelte";
    import { slide } from "svelte/transition";

    const s = createSettingsState();
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

        {#if !s.user}
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
                        href={resolve("/auth")}
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
                                {#if s.user.photoURL}
                                    <img
                                        src={s.user.photoURL}
                                        alt="Profile"
                                        class="h-16 w-16 rounded-full object-cover shadow-sm"
                                    />
                                {:else}
                                    <div
                                        class="flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F5F5] text-xl font-semibold text-gray-700"
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
                                <div>
                                    <h3
                                        class="text-lg font-medium text-gray-900"
                                    >
                                        {s.profile?.displayName ||
                                            s.user.displayName ||
                                            m.settings_not_set()}
                                    </h3>
                                    <p class="text-sm text-gray-500">
                                        {s.user.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                class="cursor-pointer text-sm font-medium text-gray-500 transition-colors hover:text-black"
                                onclick={s.startDisplayNameEdit}
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
                                {#if s.displayNameEditing}
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
                                                bind:value={s.displayNameDraft}
                                                bind:this={s.displayNameInput}
                                                oninput={s.onDisplayNameInput}
                                                onkeydown={s.handleDisplayNameKeydown}
                                            />
                                        </div>
                                        <div class="flex items-center gap-3">
                                            <button
                                                class="cursor-pointer rounded-full bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
                                                onclick={s.saveDisplayName}
                                                disabled={!s.displayNameCanSave}
                                            >
                                                {s.displayNameSaving
                                                    ? m.saving()
                                                    : m.save()}
                                            </button>
                                            <button
                                                class="cursor-pointer rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-black"
                                                onclick={s.cancelDisplayNameEdit}
                                            >
                                                {m.cancel()}
                                            </button>
                                        </div>
                                        {#if s.displayNameError}
                                            <p class="text-xs text-red-500">
                                                {s.displayNameError}
                                            </p>
                                        {/if}
                                    </div>
                                {:else}
                                    <div
                                        class="mt-1 flex items-center gap-2 text-sm text-gray-900"
                                    >
                                        <User class="h-4 w-4 text-gray-400" />
                                        <span>
                                            {s.profile?.displayName ||
                                                s.user.displayName ||
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
                                    <span class="break-all">{s.user.email}</span
                                    >
                                </div>
                            </div>
                            {#if s.profile?.createdAt}
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
                                                s.profile.createdAt,
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

                        {#if s.walletLoading}
                            <div class="flex items-center justify-center py-8">
                                <Loader2
                                    class="h-8 w-8 animate-spin text-gray-400"
                                />
                            </div>
                        {:else if s.walletError}
                            <div class="py-6 text-center">
                                <p class="font-light text-gray-500">
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
                                            {s.wallet.balanceCredits.toLocaleString()}
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

                                <button
                                    class="flex w-full cursor-pointer items-center justify-between rounded-lg border border-red-100 bg-red-50/30 p-4 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    onclick={s.handleLogout}
                                    disabled={s.loggingOut}
                                >
                                    <div class="flex items-center gap-3">
                                        <LogOut class="h-5 w-5 text-red-500" />
                                        <span
                                            class="text-sm font-medium text-red-600"
                                        >
                                            {s.loggingOut
                                                ? m.auth_signing_out()
                                                : m.auth_sign_out()}
                                        </span>
                                    </div>
                                    <div
                                        class="rounded-full bg-red-100 p-1 text-red-500"
                                    >
                                        <ArrowRight class="h-4 w-4" />
                                    </div>
                                </button>
                                {#if s.logoutError}
                                    <p class="text-xs text-red-500">
                                        {s.logoutError}
                                    </p>
                                {/if}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</MentorLayout>
