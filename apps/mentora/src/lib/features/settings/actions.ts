type ActiveMode = "mentor" | "student";

interface ModeSwitchApi {
    users: {
        updateMyProfile: (payload: {
            activeMode: ActiveMode;
        }) => Promise<{ success: boolean; error?: unknown }>;
    };
}

export async function switchActiveMode(
    api: ModeSwitchApi,
    activeMode: ActiveMode,
): Promise<{ success: boolean; error?: unknown }> {
    return api.users.updateMyProfile({ activeMode });
}

export function getNextLocale(current: string): "en" | "zh-tw" {
    return current === "en" ? "zh-tw" : "en";
}
