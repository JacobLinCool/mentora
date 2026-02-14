import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import { api } from "$lib";
import { auth } from "$lib/firebase";
import { m } from "$lib/paraglide/messages";
import { getLocale } from "$lib/paraglide/runtime";
import { signOut } from "firebase/auth";
import { tick } from "svelte";
import { SvelteDate } from "svelte/reactivity";

/**
 * Format a timestamp as a localized date string.
 * Uses the current paraglide locale for consistent display across pages.
 */
export function formatDate(timestamp: number | undefined): string {
    if (!timestamp) return m.unknown();
    return new SvelteDate(timestamp).toLocaleDateString(
        getLocale() || undefined,
        {
            year: "numeric",
            month: "long",
            day: "numeric",
        },
    );
}

/**
 * Create shared reactive state for settings pages.
 * Must be called during component initialization (for $effect support).
 */
export function createSettingsState() {
    const user = $derived(api.currentUser);
    const profile = $derived(api.currentUserProfile);

    // Display name state
    const displayNameInitial = $derived(
        (profile?.displayName ?? user?.displayName ?? "").trim(),
    );
    let displayNameDraft = $state("");
    let displayNameDirty = $state(false);
    let displayNameSaving = $state(false);
    let displayNameError = $state<string | null>(null);
    let displayNameEditing = $state(false);
    let displayNameInput = $state<HTMLInputElement | null>(null);
    const displayNameCanSave = $derived(
        !displayNameSaving && displayNameDraft.trim().length > 0,
    );

    // Wallet state
    let wallet = $state<{ balanceCredits: number } | null>(null);
    let walletLoading = $state(true);
    let walletError = $state<string | null>(null);

    // Logout state
    let loggingOut = $state(false);
    let logoutError = $state<string | null>(null);

    // Effects
    $effect(() => {
        if (!displayNameDirty && !displayNameSaving && !displayNameEditing) {
            displayNameDraft = displayNameInitial;
            displayNameError = null;
        }
    });

    $effect(() => {
        if (displayNameEditing) {
            tick().then(() => {
                displayNameInput?.focus();
                displayNameInput?.select();
            });
        }
    });

    $effect(() => {
        if (user) {
            loadWallet();
        } else {
            wallet = null;
            walletLoading = false;
        }
    });

    // Actions
    async function loadWallet() {
        walletLoading = true;
        walletError = null;
        try {
            const result = await api.wallets.getMine();
            if (result.success) {
                wallet = result.data;
            } else {
                walletError = result.error;
            }
        } catch (e) {
            walletError =
                e instanceof Error ? e.message : "Failed to load wallet";
        } finally {
            walletLoading = false;
        }
    }

    async function saveDisplayName() {
        if (!displayNameCanSave) return;

        if (displayNameDraft.trim() === displayNameInitial) {
            cancelDisplayNameEdit();
            return;
        }

        displayNameSaving = true;
        displayNameError = null;

        const result = await api.users.updateMyProfile({
            displayName: displayNameDraft.trim(),
        });

        if (!result.success) {
            displayNameError = result.error;
            displayNameSaving = false;
            return;
        }

        displayNameEditing = false;
        displayNameDirty = false;
        displayNameSaving = false;
    }

    function startDisplayNameEdit() {
        displayNameDraft = displayNameInitial;
        displayNameDirty = false;
        displayNameError = null;
        displayNameEditing = true;
    }

    function cancelDisplayNameEdit() {
        displayNameEditing = false;
        displayNameDirty = false;
        displayNameDraft = displayNameInitial;
        displayNameError = null;
    }

    function handleDisplayNameKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            saveDisplayName();
        }
        if (event.key === "Escape") {
            event.preventDefault();
            cancelDisplayNameEdit();
        }
    }

    function onDisplayNameInput() {
        displayNameDirty = true;
        displayNameError = null;
    }

    async function handleLogout() {
        if (loggingOut) return;

        loggingOut = true;
        logoutError = null;
        try {
            await signOut(auth);
            await goto(resolve("/auth"), { invalidateAll: true });
        } catch (e) {
            logoutError =
                e instanceof Error ? e.message : m.auth_sign_out_failed();
        } finally {
            loggingOut = false;
        }
    }

    return {
        get user() {
            return user;
        },
        get profile() {
            return profile;
        },
        get displayNameInitial() {
            return displayNameInitial;
        },
        get displayNameCanSave() {
            return displayNameCanSave;
        },
        get displayNameSaving() {
            return displayNameSaving;
        },
        get displayNameEditing() {
            return displayNameEditing;
        },
        get displayNameError() {
            return displayNameError;
        },
        get displayNameDraft() {
            return displayNameDraft;
        },
        set displayNameDraft(v: string) {
            displayNameDraft = v;
        },
        get displayNameInput() {
            return displayNameInput;
        },
        set displayNameInput(v: HTMLInputElement | null) {
            displayNameInput = v;
        },
        get wallet() {
            return wallet;
        },
        get walletLoading() {
            return walletLoading;
        },
        get walletError() {
            return walletError;
        },
        get loggingOut() {
            return loggingOut;
        },
        get logoutError() {
            return logoutError;
        },
        onDisplayNameInput,
        saveDisplayName,
        startDisplayNameEdit,
        cancelDisplayNameEdit,
        handleDisplayNameKeydown,
        handleLogout,
    };
}
