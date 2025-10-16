<script lang="ts">
    import { signOut, type User } from "firebase/auth";
    import { auth } from "$lib/firebase";
    import { m } from "$lib/paraglide/messages.js";
    import { Button, Card, Alert, Avatar, Badge } from "flowbite-svelte";
    import { LoaderCircle, LogOut, User as UserIcon } from "@lucide/svelte";

    interface Props {
        user: User;
    }

    let { user }: Props = $props();

    let error = $state<string | null>(null);
    let loading = $state(false);

    async function logout() {
        loading = true;
        error = null;
        try {
            await signOut(auth);
        } catch (e: unknown) {
            error = (e as Error)?.message ?? m.auth_sign_out_failed();
        } finally {
            loading = false;
        }
    }
</script>

<div class="flex h-full w-full flex-col items-center justify-center p-4">
    {#if error}
        <Alert color="red" class="mb-4">{error}</Alert>
    {/if}

    <Card class="mx-auto w-full max-w-2xl p-6">
        <div class="flex flex-col gap-6">
            <!-- User Info Section -->
            <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <Avatar src={user.photoURL ?? ""} size="lg">
                        {#if !user.photoURL}
                            <UserIcon class="h-6 w-6" />
                        {/if}
                    </Avatar>
                    <div>
                        <div
                            class="flex items-center gap-2 text-xl font-semibold"
                        >
                            {user.displayName ?? m.auth_unknown_user()}
                        </div>
                        <div class="text-sm text-gray-500">
                            {user.email}
                        </div>
                        <Badge color="green" class="mt-1">Google</Badge>
                    </div>
                </div>
            </div>

            <!-- Account Details -->
            <div
                class="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
            >
                <h3
                    class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                    {m.auth_account_details()}
                </h3>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-500">{m.auth_user_id()}:</span>
                        <span class="font-mono text-xs">{user.uid}</span>
                    </div>
                    {#if user.metadata.creationTime}
                        <div class="flex justify-between">
                            <span class="text-gray-500">{m.auth_joined()}:</span
                            >
                            <span
                                >{new Date(
                                    user.metadata.creationTime,
                                ).toLocaleDateString()}</span
                            >
                        </div>
                    {/if}
                    {#if user.metadata.lastSignInTime}
                        <div class="flex justify-between">
                            <span class="text-gray-500"
                                >{m.auth_last_sign_in()}:</span
                            >
                            <span
                                >{new Date(
                                    user.metadata.lastSignInTime,
                                ).toLocaleString()}</span
                            >
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-2">
                <Button color="red" onclick={logout} disabled={loading}>
                    {#if loading}
                        <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
                        {m.auth_signing_out()}
                    {:else}
                        <LogOut class="mr-2 h-4 w-4" />
                        {m.auth_sign_out()}
                    {/if}
                </Button>
            </div>
        </div>
    </Card>
</div>
