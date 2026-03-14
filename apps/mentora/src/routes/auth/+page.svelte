<script lang="ts">
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { api } from "$lib";
    import { m } from "$lib/paraglide/messages";
    import LoginCard from "$lib/components/auth/LoginCard.svelte";
    import {
        LoaderCircle,
        GraduationCap,
        BookOpen,
        ArrowLeft,
    } from "@lucide/svelte";

    type FlowState = "login" | "checking" | "role-select" | "verify-mentor";

    let flowState: FlowState = $state("login");
    let verifyCode = $state("");
    let verifyError: string | null = $state(null);
    let verifying = $state(false);
    let creatingProfile = $state(false);

    // If user is already logged in, check their profile
    $effect(() => {
        const user = api.currentUser;
        if (user && flowState === "login") {
            checkProfile();
        }
    });

    async function checkProfile() {
        flowState = "checking";
        await api.profileReady;

        if (api.currentUserProfile) {
            await goto(resolve("/dashboard"), { replaceState: true });
        } else {
            flowState = "role-select";
        }
    }

    async function handleLoginSuccess() {
        await checkProfile();
    }

    async function selectStudent() {
        creatingProfile = true;
        try {
            const result = await api.users.updateMyProfile({
                role: "student",
            });
            if (!result.success) {
                console.error("Failed to create profile:", result.error);
                creatingProfile = false;
                return;
            }
            await goto(resolve("/dashboard"), { replaceState: true });
        } catch (error) {
            console.error("Failed to create student profile:", error);
            creatingProfile = false;
        }
    }

    async function selectMentor() {
        flowState = "verify-mentor";
        verifyCode = "";
        verifyError = null;
    }

    async function handleVerifyMentor() {
        if (verifying || !verifyCode.trim()) return;
        verifying = true;
        verifyError = null;

        try {
            const res = await fetch("/api/verify-mentor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: verifyCode.trim() }),
            });
            const data = await res.json();

            if (!data.success) {
                verifyError = m.auth_verify_error();
                return;
            }

            creatingProfile = true;
            const result = await api.users.updateMyProfile({
                role: "mentor",
            });
            if (!result.success) {
                console.error("Failed to create profile:", result.error);
                creatingProfile = false;
                return;
            }
            await goto(resolve("/dashboard"), { replaceState: true });
        } catch (error) {
            console.error("Verification failed:", error);
            verifyError = m.auth_verify_error();
        } finally {
            verifying = false;
        }
    }

    function handleVerifyKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleVerifyMentor();
        }
    }

    function goBackToRoleSelect() {
        flowState = "role-select";
        verifyCode = "";
        verifyError = null;
    }
</script>

<div class="flex min-h-screen items-center justify-center px-4">
    <div class="w-full max-w-2xl">
        {#if flowState === "login"}
            <LoginCard onSuccess={handleLoginSuccess} />
        {:else if flowState === "checking" || creatingProfile}
            <!-- Loading state -->
            <div class="flex flex-col items-center gap-4 py-16 text-center">
                <LoaderCircle
                    class="text-text-secondary h-10 w-10 animate-spin"
                />
                <p class="text-text-secondary text-lg">
                    {creatingProfile ? m.auth_creating_profile() : m.loading()}
                </p>
            </div>
        {:else if flowState === "role-select"}
            <!-- Role selection -->
            <div class="flex flex-col items-center gap-8">
                <!-- Branding -->
                <div class="text-center">
                    <h1 class="text-text-primary mb-2 text-4xl font-bold">
                        {m.auth_welcome()}
                    </h1>
                    <p class="text-text-secondary text-lg">
                        {m.auth_select_role()}
                    </p>
                </div>

                <!-- Role cards -->
                <div class="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
                    <!-- Student card -->
                    <button
                        class="card-glass group hover:border-brand-silver flex flex-col items-center gap-4 rounded-3xl p-8 transition hover:brightness-110"
                        onclick={selectStudent}
                    >
                        <div
                            class="bg-brand-silver/20 text-brand-silver group-hover:bg-brand-silver/30 flex h-16 w-16 items-center justify-center rounded-full transition"
                        >
                            <GraduationCap class="h-8 w-8" />
                        </div>
                        <div class="text-center">
                            <h2
                                class="text-text-primary mb-1 text-xl font-semibold"
                            >
                                {m.auth_student_title()}
                            </h2>
                            <p class="text-text-secondary text-sm">
                                {m.auth_student_description()}
                            </p>
                        </div>
                    </button>

                    <!-- Mentor card -->
                    <button
                        class="card-glass group hover:border-brand-gold flex flex-col items-center gap-4 rounded-3xl p-8 transition hover:brightness-110"
                        onclick={selectMentor}
                    >
                        <div
                            class="bg-brand-gold/20 text-brand-gold group-hover:bg-brand-gold/30 flex h-16 w-16 items-center justify-center rounded-full transition"
                        >
                            <BookOpen class="h-8 w-8" />
                        </div>
                        <div class="text-center">
                            <h2
                                class="text-text-primary mb-1 text-xl font-semibold"
                            >
                                {m.auth_mentor_title()}
                            </h2>
                            <p class="text-text-secondary text-sm">
                                {m.auth_mentor_description()}
                            </p>
                        </div>
                    </button>
                </div>
            </div>
        {:else if flowState === "verify-mentor"}
            <!-- Mentor access code verification -->
            <div class="flex flex-col items-center gap-6">
                <div class="text-center">
                    <h1 class="text-text-primary mb-2 text-4xl font-bold">
                        {m.auth_welcome()}
                    </h1>
                    <p class="text-text-secondary text-lg">
                        {m.auth_mentor_title()}
                    </p>
                </div>

                <div class="card-glass w-full max-w-sm rounded-3xl p-8">
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                        class="flex flex-col gap-4"
                        onkeydown={handleVerifyKeydown}
                    >
                        <input
                            class="border-glass-border text-text-primary placeholder:text-text-secondary focus:border-brand-gold focus:ring-brand-gold w-full rounded-xl border bg-white/10 px-4 py-3 text-sm focus:ring-1 focus:outline-none"
                            type="password"
                            placeholder={m.auth_verify_code_placeholder()}
                            bind:value={verifyCode}
                        />

                        {#if verifyError}
                            <p class="text-status-error text-sm">
                                {verifyError}
                            </p>
                        {/if}

                        <button
                            class="bg-brand-gold flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 transition hover:brightness-110 disabled:opacity-50"
                            onclick={handleVerifyMentor}
                            disabled={verifying || !verifyCode.trim()}
                        >
                            {#if verifying}
                                <LoaderCircle class="h-4 w-4 animate-spin" />
                            {/if}
                            {m.auth_verify_submit()}
                        </button>

                        <button
                            class="text-text-secondary hover:text-text-primary flex items-center justify-center gap-1 text-sm transition"
                            onclick={goBackToRoleSelect}
                        >
                            <ArrowLeft class="h-4 w-4" />
                            {m.auth_verify_back()}
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>
