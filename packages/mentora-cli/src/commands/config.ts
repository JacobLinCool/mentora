/**
 * Config command for managing CLI configuration
 */
import { Command } from "commander";
import {
    clearConfig,
    getConfig,
    getConfigPath,
    setConfig,
    type MentoraConfig,
} from "../config.js";
import { error, info, outputData, success } from "../utils/output.js";

export function createConfigCommand(): Command {
    const config = new Command("config").description(
        "Manage CLI configuration",
    );

    config
        .command("show")
        .description("Show current configuration")
        .action(() => {
            const currentConfig = getConfig();
            info(`Config file: ${getConfigPath()}`);
            outputData(currentConfig);
        });

    config
        .command("set")
        .description("Set a configuration value")
        .argument(
            "<key>",
            "Configuration key (projectId, apiKey, authDomain, backendBaseUrl)",
        )
        .argument("<value>", "Configuration value")
        .action((key: string, value: string) => {
            const validKeys: (keyof MentoraConfig)[] = [
                "projectId",
                "apiKey",
                "authDomain",
                "backendBaseUrl",
            ];
            if (!validKeys.includes(key as keyof MentoraConfig)) {
                error(`Invalid key. Valid keys: ${validKeys.join(", ")}`);
                process.exit(1);
            }
            setConfig(key as keyof MentoraConfig, value);
            success(`Set ${key} = ${value}`);
        });

    config
        .command("clear")
        .description("Clear all configuration")
        .action(() => {
            clearConfig();
            success("Configuration cleared.");
        });

    config
        .command("path")
        .description("Show configuration file path")
        .action(() => {
            console.log(getConfigPath());
        });

    return config;
}
