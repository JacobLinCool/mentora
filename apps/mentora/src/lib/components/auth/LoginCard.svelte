<script lang="ts">
    import {
        GoogleAuthProvider,
        signInWithPopup,
        setPersistence,
        browserLocalPersistence,
    } from "firebase/auth";
    import { auth } from "$lib/firebase";
    import { m } from "$lib/paraglide/messages.js";
    import { Button, Card, Alert } from "flowbite-svelte";
    import { LoaderCircle, LogIn } from "@lucide/svelte";
    import { goto } from "$app/navigation";

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
            await signInWithPopup(auth, provider);
            // eslint-disable-next-line svelte/no-navigation-without-resolve
            await goto("/");
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

    <Card class="mx-auto p-4 text-center">
        <div class="flex flex-col items-center gap-4">
            <div class="text-2xl font-semibold">
                {m.auth_sign_in_title()}
            </div>
            <p class="text-sm text-gray-500">{m.auth_sign_in_subtitle()}</p>
            <Button onclick={login} class="w-full sm:w-auto" disabled={loading}>
                {#if loading}
                    <LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
                    {m.auth_signing_in()}
                {:else}
                    <LogIn class="mr-2 h-5 w-5" />
                    {m.auth_continue_with_google()}
                {/if}
            </Button>
        </div>
    </Card>
</div>
