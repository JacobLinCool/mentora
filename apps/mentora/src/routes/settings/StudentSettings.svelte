<script lang="ts">
    import { onMount } from "svelte";
    import { m } from "$lib/paraglide/messages";
    import { getLocale, setLocale } from "$lib/paraglide/runtime";
    import { createSettingsState, formatDate } from "$lib/settings.svelte";
    import { getNextLocale } from "$lib/features/settings/actions";
    import CosmicButton from "$lib/components/ui/CosmicButton.svelte";
    import BottomNav from "$lib/components/layout/student/BottomNav.svelte";
    import posthog from "posthog-js";
    import {
        User,
        Mail,
        Calendar,
        ArrowRight,
        Check,
        LoaderCircle,
        Pencil,
        X,
        Globe,
        LogOut,
        ChevronRight,
    } from "@lucide/svelte";

    const s = createSettingsState();

    onMount(() => {
        document.documentElement.classList.add("dark");
    });
</script>

<div
    class="student-shell w-full overflow-x-hidden font-sans selection:bg-white/25 selection:text-white"
>
    <main class="relative z-10 w-full">
        <div class="student-container pt-12">
            <div class="mb-8 flex items-center justify-between">
                <h1
                    class="font-serif-tc text-3xl font-bold text-white md:text-4xl"
                >
                    {m.settings_title()}
                </h1>
            </div>

            {#if !s.user}
                <div class="student-panel animate-slide-up p-6 text-center">
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
                        <CosmicButton
                            href="/auth"
                            variant="secondary"
                            className="student-action-btn !shadow-none"
                        >
                            <span>{m.settings_sign_in()}</span>
                            <ArrowRight class="h-5 w-5" />
                        </CosmicButton>
                    </div>
                </div>
            {:else}
                <div class="space-y-8 pb-24">
                    <!-- Profile Section -->
                    <section>
                        <h2
                            class="font-serif-tc mb-4 text-2xl font-bold text-white"
                        >
                            {m.settings_profile()}
                        </h2>
                        <div
                            class="animate-slide-up py-2"
                            style="container-type: inline-size"
                        >
                            <div
                                class="mx-auto flex max-w-[40rem] flex-col gap-6"
                            >
                                <div class="flex justify-center">
                                    {#if s.user.photoURL}
                                        <img
                                            src={s.user.photoURL}
                                            alt={m.settings_profile()}
                                            class="h-20 w-20 rounded-full object-cover"
                                        />
                                    {:else}
                                        <div
                                            class="flex h-20 w-20 items-center justify-center rounded-full bg-[#646464] font-serif text-5xl text-white"
                                        >
                                            {(
                                                s.user.displayName ||
                                                s.user.email ||
                                                m.unknown()
                                            )
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                    {/if}
                                </div>

                                <div class="space-y-5 px-4">
                                    <div>
                                        <div
                                            class="mb-2 text-sm font-semibold tracking-[0.14em] text-white/84 uppercase"
                                        >
                                            {m.settings_display_name()}
                                        </div>
                                        {#if s.displayNameEditing}
                                            <div
                                                class="flex items-center gap-2 rounded-xl bg-[#5b5b5b] px-4 py-3 text-white"
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
                                        {:else}
                                            <div
                                                class="flex items-center gap-3 text-white"
                                            >
                                                <User
                                                    class="h-5 w-5 shrink-0 text-white/90"
                                                />
                                                <span
                                                    class="truncate"
                                                    style="font-size: clamp(0.9rem, 5cqw, 1.25rem)"
                                                >
                                                    {s.profile?.displayName ||
                                                        s.user.displayName ||
                                                        m.settings_not_set()}
                                                </span>
                                            </div>
                                        {/if}
                                        {#if s.displayNameError}
                                            <p
                                                class="text-status-error mt-2 text-xs"
                                            >
                                                {s.displayNameError}
                                            </p>
                                        {/if}
                                    </div>

                                    <div>
                                        <div
                                            class="mb-2 text-sm font-semibold tracking-[0.14em] text-white/84 uppercase"
                                        >
                                            {m.settings_email()}
                                        </div>
                                        <div
                                            class="flex items-center gap-3 text-white"
                                        >
                                            <Mail
                                                class="h-5 w-5 shrink-0 text-white/90"
                                            />
                                            <span
                                                class="break-all"
                                                style="font-size: clamp(0.9rem, 5cqw, 1.18rem)"
                                                >{s.user.email}</span
                                            >
                                        </div>
                                    </div>

                                    {#if s.profile?.createdAt}
                                        <div>
                                            <div
                                                class="mb-2 text-sm font-semibold tracking-[0.14em] text-white/84 uppercase"
                                            >
                                                {m.settings_member_since()}
                                            </div>
                                            <div
                                                class="flex items-center gap-3 text-white"
                                            >
                                                <Calendar
                                                    class="h-5 w-5 shrink-0 text-white/90"
                                                />
                                                <span
                                                    style="font-size: clamp(0.9rem, 5cqw, 1.18rem)"
                                                    >{formatDate(
                                                        s.profile.createdAt,
                                                    )}</span
                                                >
                                            </div>
                                        </div>
                                    {/if}
                                </div>

                                {#if s.displayNameEditing}
                                    <div
                                        class="flex flex-wrap items-center justify-center gap-3"
                                    >
                                        <button
                                            type="button"
                                            onclick={s.saveDisplayName}
                                            disabled={!s.displayNameCanSave}
                                            class="student-panel student-panel-hover inline-flex min-w-[7.25rem] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white/90 disabled:cursor-not-allowed disabled:opacity-45"
                                        >
                                            {#if s.displayNameSaving}
                                                <LoaderCircle
                                                    class="h-4 w-4 animate-spin"
                                                />
                                                <span>{m.save()}</span>
                                            {:else}
                                                <Check
                                                    class="h-4 w-4 text-white/80"
                                                />
                                                <span>{m.save()}</span>
                                            {/if}
                                        </button>
                                        <button
                                            type="button"
                                            onclick={s.cancelDisplayNameEdit}
                                            class="student-panel student-panel-hover inline-flex min-w-[7.25rem] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white/90"
                                        >
                                            <X class="h-4 w-4 text-white/80" />
                                            <span>{m.cancel()}</span>
                                        </button>
                                    </div>
                                {:else}
                                    <button
                                        class="student-panel student-panel-hover student-clickable flex w-full items-center justify-between rounded-[1.25rem] p-4 text-left active:scale-[0.98]"
                                        onclick={s.startDisplayNameEdit}
                                        aria-label={m.settings_edit_display_name_aria()}
                                    >
                                        <span
                                            class="inline-flex items-center gap-2"
                                        >
                                            <Pencil
                                                class="h-4 w-4 text-white/75"
                                            />
                                            <span
                                                class="text-sm font-medium text-white"
                                            >
                                                {m.settings_edit_profile()}
                                            </span>
                                        </span>
                                        <ChevronRight
                                            class="h-5 w-5 text-white/55"
                                        />
                                    </button>
                                {/if}
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2
                            class="font-serif-tc mb-4 text-2xl font-bold text-white"
                        >
                            {m.settings_preferences()}
                        </h2>
                        <div class="space-y-3">
                            <button
                                class="student-panel student-panel-hover student-clickable flex w-full items-center justify-between p-4 text-left active:scale-[0.98]"
                                onclick={() => {
                                    const next = getNextLocale(getLocale());
                                    posthog.capture("language_changed", {
                                        from: getLocale(),
                                        to: next,
                                    });
                                    setLocale(next);
                                }}
                            >
                                <span class="inline-flex items-center gap-2">
                                    <Globe class="h-4 w-4" />
                                    <span
                                        class="text-base font-medium text-white"
                                    >
                                        {getLocale() === "en"
                                            ? m.settings_switch_to_traditional_chinese()
                                            : m.settings_switch_to_english()}
                                    </span>
                                </span>
                                <ChevronRight class="h-5 w-5 text-white/65" />
                            </button>
                            <button
                                class="student-panel student-panel-hover student-clickable flex w-full items-center justify-between p-4 text-left active:scale-[0.98]"
                                onclick={s.handleLogout}
                                disabled={s.loggingOut}
                            >
                                {#if s.loggingOut}
                                    <span
                                        class="inline-flex items-center gap-2"
                                    >
                                        <LoaderCircle
                                            class="h-4 w-4 animate-spin"
                                        />
                                        <span
                                            class="text-base font-medium text-white/90"
                                        >
                                            {m.auth_signing_out()}
                                        </span>
                                    </span>
                                    <span class="h-5 w-5"></span>
                                {:else}
                                    <span
                                        class="inline-flex items-center gap-2"
                                    >
                                        <LogOut class="h-4 w-4 text-white/80" />
                                        <span
                                            class="text-base font-medium text-white/90"
                                        >
                                            {m.auth_sign_out()}
                                        </span>
                                    </span>
                                    <ChevronRight
                                        class="h-5 w-5 text-white/55"
                                    />
                                {/if}
                            </button>
                            {#if s.logoutError}
                                <p class="text-status-error px-1 text-sm">
                                    {s.logoutError}
                                </p>
                            {/if}
                        </div>
                    </section>
                </div>

                <BottomNav activeTab="profile" />
            {/if}
        </div>
    </main>
</div>
