export type ActiveMode = "mentor" | "student";

export function getActiveMode(mode: string | null | undefined): ActiveMode {
    return mode === "mentor" ? "mentor" : "student";
}

export function isMentorMode(mode: string | null | undefined): boolean {
    return getActiveMode(mode) === "mentor";
}

export function resolveRoleRoute(
    section: "dashboard" | "settings" | "notifications",
    mode: string | null | undefined,
): string {
    const activeMode = getActiveMode(mode);

    if (section === "notifications") {
        return activeMode === "mentor" ? "/notifications" : "/dashboard";
    }

    return section === "dashboard" ? "/dashboard" : "/settings";
}
