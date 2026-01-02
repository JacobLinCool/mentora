/**
 * Configuration management for Mentora CLI
 */
import Conf from "conf";

export interface MentoraConfig {
    projectId?: string;
    apiKey?: string;
    authDomain?: string;
    backendBaseUrl?: string;
    authData?: string;
}

const config = new Conf<MentoraConfig>({
    projectName: "mentora-cli",
    schema: {
        projectId: { type: "string" },
        apiKey: { type: "string" },
        authDomain: { type: "string" },
        backendBaseUrl: { type: "string" },
        authData: { type: "string" },
    },
});

export function getConfig(): MentoraConfig {
    return {
        projectId:
            process.env.MENTORA_FIREBASE_PROJECT_ID || config.get("projectId"),
        apiKey: process.env.MENTORA_FIREBASE_API_KEY || config.get("apiKey"),
        authDomain:
            process.env.MENTORA_FIREBASE_AUTH_DOMAIN ||
            config.get("authDomain"),
        backendBaseUrl:
            process.env.MENTORA_BACKEND_URL || config.get("backendBaseUrl"),
        authData: config.get("authData"),
    };
}

export function setConfig<K extends keyof MentoraConfig>(
    key: K,
    value: MentoraConfig[K],
): void {
    config.set(key, value);
}

export function deleteConfig<K extends keyof MentoraConfig>(key: K): void {
    config.delete(key);
}

export function clearConfig(): void {
    config.clear();
}

export function getConfigPath(): string {
    return config.path;
}
