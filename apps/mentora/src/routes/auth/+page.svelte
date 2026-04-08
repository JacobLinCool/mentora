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
    import posthog from "posthog-js";

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
            posthog.capture("role_selected", { role: "student" });
            await goto(resolve("/dashboard"), { replaceState: true });
        } catch (error) {
            posthog.captureException(error);
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
                posthog.capture("mentor_verification_failed");
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
            posthog.capture("mentor_verified");
            posthog.capture("role_selected", { role: "mentor" });
            await goto(resolve("/dashboard"), { replaceState: true });
        } catch (error) {
            posthog.captureException(error);
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

<div class="student-shell flex items-center justify-center px-4">
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
                    <h1
                        class="font-serif-tc mb-2 text-4xl font-bold text-white"
                    >
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
                        class="student-panel student-panel-hover student-clickable group flex flex-col items-center gap-4 p-8"
                        onclick={selectStudent}
                    >
                        <div
                            class="flex h-16 w-16 items-center justify-center rounded-full border border-white/22 bg-[#6a6a6a] text-white transition"
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
                        class="student-panel student-panel-hover student-clickable group flex flex-col items-center gap-4 p-8"
                        onclick={selectMentor}
                    >
                        <div
                            class="flex h-16 w-16 items-center justify-center rounded-full border border-white/22 bg-[#6a6a6a] text-white transition"
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
                    <h1
                        class="font-serif-tc mb-2 text-4xl font-bold text-white"
                    >
                        {m.auth_welcome()}
                    </h1>
                    <p class="text-text-secondary text-lg">
                        {m.auth_mentor_title()}
                    </p>
                </div>

                <div class="student-panel w-full max-w-sm p-8">
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                        class="flex flex-col gap-4"
                        onkeydown={handleVerifyKeydown}
                    >
                        <input
                            class="w-full rounded-xl border border-white/24 bg-[#5b5b5b] px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/42 focus:outline-none"
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
                            class="student-clickable flex w-full items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
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
