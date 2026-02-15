export type ActiveMode = "mentor" | "student";

export function getActiveMode(mode: string | null | undefined): ActiveMode {
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
