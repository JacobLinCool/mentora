import { browser } from "$app/environment";

export type ActiveMode = "mentor" | "student";

const ACTIVE_MODE_STORAGE_KEY = "mentora:active-mode";

function readStoredActiveMode(): ActiveMode | null {
    if (!browser) {
        return null;
    }

    const value = localStorage.getItem(ACTIVE_MODE_STORAGE_KEY);
    return value === "mentor" || value === "student" ? value : null;
}

export function persistActiveMode(mode: ActiveMode): void {
    if (!browser) {
        return;
    }

    localStorage.setItem(ACTIVE_MODE_STORAGE_KEY, mode);
}

export function getProfileMode(profile: unknown): string | null {
    if (!profile || typeof profile !== "object") {
        return null;
    }

    const mode = (profile as { activeMode?: unknown }).activeMode;
    return typeof mode === "string" ? mode : null;
}

export function getActiveMode(mode: string | null | undefined): ActiveMode {
    const storedMode = readStoredActiveMode();
    if (storedMode) {
        return storedMode;
    }

    return mode === "mentor" ? "mentor" : "student";
}

export function isMentorMode(mode: string | null | undefined): boolean {
    return getActiveMode(mode) === "mentor";
}

export function resolveRoleRoute(
    section: "dashboard" | "settings" | "announcements",
    mode: string | null | undefined,
): string {
    if (section === "announcements") {
        return "/announcements";
    }

    const activeMode = getActiveMode(mode);
    return activeMode === "mentor"
        ? section === "dashboard"
            ? "/dashboard"
            : "/settings"
        : section === "dashboard"
          ? "/dashboard"
          : "/settings";
}
