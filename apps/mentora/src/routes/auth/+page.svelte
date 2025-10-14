<script lang="ts">
    import { onMount } from "svelte";
    import {
        GoogleAuthProvider,
        onAuthStateChanged,
        onIdTokenChanged,
        signInWithPopup,
        setPersistence,
        browserLocalPersistence,
        signOut,
        type User,
    } from "firebase/auth";
    import { auth } from "$lib/firebase";
    import { m } from "$lib/paraglide/messages.js";

    import {
        Button,
        Card,
        Textarea,
        Tooltip,
        Alert,
        Avatar,
        Badge,
    } from "flowbite-svelte";

    import {
        LoaderCircle,
        LogOut,
        Copy,
        Eye,
        EyeOff,
        RefreshCw,
        LogIn,
    } from "@lucide/svelte";

    let user = $state<User | null>(null);
    let idToken = $state<string | null>(null);
    let error = $state<string | null>(null);
    let loading = $state(false);
    let copying = $state(false);
    let refreshing = $state(false);
    let showToken = $state(false);

    type TokenMeta = {
        iat?: number;
        exp?: number;
        email?: string;
        name?: string;
        uid?: string;
    };
    let meta = $state<TokenMeta>({});
    let remaining = $state<string>("");

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
            const cred = await signInWithPopup(auth, provider);
            user = cred.user;
            idToken = await cred.user.getIdToken();
            updateMetaFromToken(idToken);
        } catch (e: unknown) {
            error = (e as Error)?.message ?? m.auth_sign_in_failed();
        } finally {
            loading = false;
        }
    }

    async function refresh() {
        if (!user) return;
        refreshing = true;
        error = null;
        try {
            idToken = await user.getIdToken(true);
            updateMetaFromToken(idToken);
        } catch (e: unknown) {
            error = (e as Error)?.message ?? m.auth_refresh_token_failed();
        } finally {
            refreshing = false;
        }
    }

    async function logout() {
        loading = true;
        error = null;
        try {
            await signOut(auth);
            user = null;
            idToken = null;
            meta = {};
        } catch (e: unknown) {
            error = (e as Error)?.message ?? m.auth_sign_out_failed();
        } finally {
            loading = false;
        }
    }

    function decodeJwt(token: string): Record<string, unknown> | null {
        try {
            const [, payload] = token.split(".");
            const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
            return JSON.parse(
                decodeURIComponent(
                    Array.from(json)
                        .map(
                            (c) =>
                                "%" +
                                c.charCodeAt(0).toString(16).padStart(2, "0"),
                        )
                        .join(""),
                ),
            );
        } catch {
            return null;
        }
    }

    function updateMetaFromToken(token: string | null) {
        if (!token) {
            meta = {};
            return;
        }
        const p = decodeJwt(token) ?? {};
        meta = {
            iat: typeof p.iat === "number" ? p.iat : undefined,
            exp: typeof p.exp === "number" ? p.exp : undefined,
            email: typeof p.email === "string" ? p.email : undefined,
            name: typeof p.name === "string" ? p.name : undefined,
            uid:
                typeof p.user_id === "string"
                    ? p.user_id
                    : typeof p.uid === "string"
                      ? p.uid
                      : undefined,
        };
    }

    let timer: number | null = null;
    $effect(() => {
        if (!meta.exp) {
            remaining = "";
            return;
        }
        if (timer) clearInterval(timer);
        const tick = () => {
            const secs = Math.max(0, meta.exp! - Math.floor(Date.now() / 1000));
            const hrs = Math.floor(secs / 3600);
            const mins = Math.floor((secs % 3600) / 60);
            const s = secs % 60;
            remaining = `${hrs}h ${mins}m ${s}s`;
        };
        tick();
        timer = setInterval(tick, 1000) as unknown as number;
        return () => {
            if (timer) clearInterval(timer);
        };
    });

    async function copyToken() {
        if (!idToken) return;
        copying = true;
        try {
            await navigator.clipboard.writeText(idToken);
        } finally {
            copying = false;
        }
    }

    onMount(() => {
        const unsubAuth = onAuthStateChanged(auth, async (u) => {
            user = u;
            idToken = u ? await u.getIdToken() : null;
            updateMetaFromToken(idToken);
        });
        const unsubToken = onIdTokenChanged(auth, async (u) => {
            idToken = u ? await u.getIdToken() : null;
            updateMetaFromToken(idToken);
        });
        return () => {
            unsubAuth();
            unsubToken();
        };
    });
</script>

<div class="flex h-full w-full flex-col items-center justify-center p-4">
    {#if error}
        <Alert color="red" class="mb-4">{error}</Alert>
    {/if}

    {#if !user}
        <Card class="mx-auto p-4 text-center">
            <div class="flex flex-col items-center gap-4">
                <div class="text-2xl font-semibold">
                    {m.auth_sign_in_title()}
                </div>
                <p class="text-sm text-gray-500">{m.auth_sign_in_subtitle()}</p>
                <Button
                    onclick={login}
                    class="w-full sm:w-auto"
                    disabled={loading}
                >
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
    {:else}
        <Card class="mx-auto w-full max-w-3xl p-6">
            <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <Avatar src={user.photoURL ?? ""} size="lg">
                            {#if !user.photoURL}
                                {user.displayName?.[0] ?? "U"}
                            {/if}
                        </Avatar>
                        <div>
                            <div
                                class="flex items-center gap-2 text-lg font-semibold"
                            >
                                {user.displayName ?? m.auth_unknown_user()}
                                <Badge color="green">Google</Badge>
                            </div>
                            <div class="text-sm text-gray-500">
                                {user.email}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        {#if meta.exp}
                            <Badge>{remaining || "—"}</Badge>
                            <Tooltip placement="bottom">
                                {m.auth_time_until_token_expires()}
                            </Tooltip>
                        {/if}
                        <Button
                            color="light"
                            onclick={logout}
                            disabled={loading}
                            ><LogOut class="mr-1 h-4 w-4" />
                            {m.auth_sign_out()}</Button
                        >
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <div class="text-sm font-medium">
                        {m.auth_id_token_label()}
                    </div>
                    <div class="flex w-full gap-2">
                        <div class="flex-1">
                            <Textarea
                                value={showToken
                                    ? (idToken ?? "")
                                    : idToken
                                      ? "••• hidden •••"
                                      : ""}
                                readonly
                                rows={6}
                                class="w-full font-mono text-xs"
                            />
                        </div>
                        <div class="flex flex-col gap-2">
                            <Button
                                color="light"
                                onclick={() => (showToken = !showToken)}
                            >
                                {#if showToken}<EyeOff class="mr-1 h-4 w-4" />
                                    {m.auth_hide()}{:else}<Eye
                                        class="mr-1 h-4 w-4"
                                    />
                                    {m.auth_show()}{/if}
                            </Button>
                            <Button
                                color="light"
                                onclick={copyToken}
                                disabled={!idToken || copying}
                            >
                                <Copy class="mr-1 h-4 w-4" />
                                {copying ? m.auth_copied() : m.auth_copy()}
                            </Button>
                            <Button onclick={refresh} disabled={refreshing}>
                                {#if refreshing}<LoaderCircle
                                        class="mr-1 h-4 w-4 animate-spin"
                                    />
                                    {m.auth_refreshing()}{:else}<RefreshCw
                                        class="mr-1 h-4 w-4"
                                    />
                                    {m.auth_refresh()}{/if}
                            </Button>
                        </div>
                    </div>
                    {#if meta.exp || meta.iat}
                        <div
                            class="flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:justify-between"
                        >
                            <div>
                                {m.auth_issued()}
                                {meta.iat
                                    ? new Date(meta.iat * 1000).toLocaleString()
                                    : "—"}
                            </div>
                            <div>
                                {m.auth_expires()}
                                {meta.exp
                                    ? new Date(meta.exp * 1000).toLocaleString()
                                    : "—"}
                            </div>
                            <div>{m.auth_auto_rotates()}</div>
                        </div>
                    {/if}
                </div>
            </div>
        </Card>
    {/if}
</div>
