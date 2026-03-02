import { persistActiveMode } from "$lib/features/routing/role";

type ActiveMode = "mentor" | "student";

interface ModeSwitchApi {
    users: {
        updateMyProfile: (
            payload: Record<string, unknown>,
        ) => Promise<{ success: boolean; error?: unknown }>;
    };
}

export async function switchActiveMode(
    api: ModeSwitchApi,
    activeMode: ActiveMode,
): Promise<{ success: boolean; error?: unknown }> {
    persistActiveMode(activeMode);
    return api.users.updateMyProfile({ activeMode });
}

export function getNextLocale(current: string): "en" | "zh-tw" {
    return current === "en" ? "zh-tw" : "en";
}
