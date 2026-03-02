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
    const result = await api.users.updateMyProfile({ activeMode });
    if (result.success) {
        persistActiveMode(activeMode);
    }
    return result;
}

export function getNextLocale(current: string): "en" | "zh-tw" {
    return current === "en" ? "zh-tw" : "en";
}
