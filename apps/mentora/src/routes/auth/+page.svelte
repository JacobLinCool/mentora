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

<div class="flex min-h-screen items-center justify-center bg-[#f5f5f5] px-4">
    <div class="w-full max-w-2xl">
        {#if flowState === "login"}
            <LoginCard onSuccess={handleLoginSuccess} />
        {:else if flowState === "checking" || creatingProfile}
            <!-- Loading state -->
            <div class="flex flex-col items-center gap-4 py-16 text-center">
                <LoaderCircle class="h-10 w-10 animate-spin text-gray-500" />
                <p class="text-lg text-gray-600">
                    {creatingProfile ? m.auth_creating_profile() : m.loading()}
                </p>
            </div>
        {:else if flowState === "role-select"}
            <!-- Role selection -->
            <div class="flex flex-col items-center gap-8">
                <!-- Branding -->
                <div class="text-center">
                    <h1 class="mb-2 text-4xl font-bold text-gray-900">
                        {m.auth_welcome()}
                    </h1>
                    <p class="text-lg text-gray-500">
                        {m.auth_select_role()}
                    </p>
                </div>

                <!-- Role cards -->
                <div class="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
                    <!-- Student card -->
                    <button
                        class="group flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                        onclick={selectStudent}
                    >
                        <div
                            class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition group-hover:bg-blue-100"
                        >
                            <GraduationCap class="h-8 w-8" />
                        </div>
                        <div class="text-center">
                            <h2
                                class="mb-1 text-xl font-semibold text-gray-900"
                            >
                                {m.auth_student_title()}
                            </h2>
                            <p class="text-sm text-gray-500">
                                {m.auth_student_description()}
                            </p>
                        </div>
                    </button>

                    <!-- Mentor card -->
                    <button
                        class="group flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:border-amber-300 hover:shadow-md"
                        onclick={selectMentor}
                    >
                        <div
                            class="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 transition group-hover:bg-amber-100"
                        >
                            <BookOpen class="h-8 w-8" />
                        </div>
                        <div class="text-center">
                            <h2
                                class="mb-1 text-xl font-semibold text-gray-900"
                            >
                                {m.auth_mentor_title()}
                            </h2>
                            <p class="text-sm text-gray-500">
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
                    <h1 class="mb-2 text-4xl font-bold text-gray-900">
                        {m.auth_welcome()}
                    </h1>
                    <p class="text-lg text-gray-500">
                        {m.auth_mentor_title()}
                    </p>
                </div>

                <div
                    class="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
                >
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                        class="flex flex-col gap-4"
                        onkeydown={handleVerifyKeydown}
                    >
                        <input
                            class="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                            type="password"
                            placeholder={m.auth_verify_code_placeholder()}
                            bind:value={verifyCode}
                        />

                        {#if verifyError}
                            <p class="text-sm text-red-600">{verifyError}</p>
                        {/if}

                        <button
                            class="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
                            onclick={handleVerifyMentor}
                            disabled={verifying || !verifyCode.trim()}
                        >
                            {#if verifying}
                                <LoaderCircle class="h-4 w-4 animate-spin" />
                            {/if}
                            {m.auth_verify_submit()}
                        </button>

                        <button
                            class="flex items-center justify-center gap-1 text-sm text-gray-500 transition hover:text-gray-700"
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
