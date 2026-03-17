<script lang="ts">
    import type { User } from "firebase/auth";
    import {
        GoogleAuthProvider,
        signInWithPopup,
        setPersistence,
        browserLocalPersistence,
    } from "firebase/auth";
    import { auth } from "$lib/firebase";
    import { m } from "$lib/paraglide/messages";
    import { Alert } from "flowbite-svelte";
    import { LoaderCircle, LogIn } from "@lucide/svelte";

    interface Props {
        onSuccess?: (user: User) => void;
    }

    let { onSuccess }: Props = $props();

    let error = $state<string | null>(null);
    let loading = $state(false);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    async function ensurePersistence() {
        try {
            await setPersistence(auth, browserLocalPersistence);
        } catch {
            // Ignore persistence errors
        }
    }

    async function login() {
        loading = true;
        error = null;
        await ensurePersistence();
        try {
            const result = await signInWithPopup(auth, provider);
            onSuccess?.(result.user);
        } catch (e: unknown) {
            error = (e as Error)?.message ?? m.auth_sign_in_failed();
        } finally {
            loading = false;
        }
    }
</script>

<div class="flex h-full w-full flex-col items-center justify-center p-4">
    {#if error}
        <Alert color="red" class="mb-4">{error}</Alert>
    {/if}

    <div class="student-panel mx-auto max-w-sm p-8 text-center">
        <div class="flex flex-col items-center gap-4">
            <div class="font-serif-tc text-3xl font-bold text-white">
                {m.auth_sign_in_title()}
            </div>
            <p class="text-text-secondary text-sm">
                {m.auth_sign_in_subtitle()}
            </p>
            <button
                onclick={login}
                class="student-clickable flex w-full items-center justify-center gap-2 rounded-3xl px-6 py-3 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
                disabled={loading}
            >
                {#if loading}
                    <LoaderCircle class="h-5 w-5 animate-spin" />
                    {m.auth_signing_in()}
                {:else}
                    <LogIn class="h-5 w-5" />
                    {m.auth_continue_with_google()}
                {/if}
            </button>
        </div>
    </div>
</div>
