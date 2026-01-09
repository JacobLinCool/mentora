/**
 * Output formatting utilities for CLI
 */
import chalk from "chalk";

export interface OutputOptions {
    json?: boolean;
}

let globalOptions: OutputOptions = {};

export function setOutputOptions(options: OutputOptions): void {
    globalOptions = options;
}

export function getOutputOptions(): OutputOptions {
    return globalOptions;
}

export function success(message: string): void {
    if (!globalOptions.json) {
        console.log(chalk.green("✓") + " " + message);
    }
}

export function error(message: string, code?: string): void {
    if (!globalOptions.json) {
        const codeSuffix = code ? ` ${chalk.dim(`[${code}]`)}` : "";
        console.error(chalk.red("✗") + " " + message + codeSuffix);
    } else {
        console.error(JSON.stringify({ error: message, code }));
    }
}

export function info(message: string): void {
    if (!globalOptions.json) {
        console.log(chalk.blue("ℹ") + " " + message);
    }
}

export function warn(message: string): void {
    if (!globalOptions.json) {
        console.log(chalk.yellow("⚠") + " " + message);
    }
}

export function outputData<T>(data: T): void {
    if (globalOptions.json) {
        console.log(JSON.stringify(data, null, 2));
    } else {
        console.log(formatData(data));
    }
}

export function outputList<T>(
    items: T[],
    formatItem?: (item: T) => string,
): void {
    if (globalOptions.json) {
        console.log(JSON.stringify(items, null, 2));
    } else if (items.length === 0) {
        info("No items found.");
    } else {
        items.forEach((item, index) => {
            if (formatItem) {
                console.log(`${index + 1}. ${formatItem(item)}`);
            } else {
                console.log(`${index + 1}. ${formatData(item)}`);
            }
        });
    }
}

function formatData(data: unknown): string {
    if (data === null || data === undefined) {
        return chalk.dim("null");
    }
    if (typeof data === "object") {
        return formatObject(data as Record<string, unknown>);
    }
    return String(data);
}

function formatObject(obj: Record<string, unknown>, indent = 0): string {
    const lines: string[] = [];
    const pad = "  ".repeat(indent);

    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
            lines.push(`${pad}${chalk.cyan(key)}: ${chalk.dim("null")}`);
        } else if (typeof value === "object" && !Array.isArray(value)) {
            lines.push(`${pad}${chalk.cyan(key)}:`);
            lines.push(
                formatObject(value as Record<string, unknown>, indent + 1),
            );
        } else if (Array.isArray(value)) {
            lines.push(`${pad}${chalk.cyan(key)}: [${value.length} items]`);
        } else {
            lines.push(`${pad}${chalk.cyan(key)}: ${value}`);
        }
    }

    return lines.join("\n");
}

export function formatTimestamp(timestamp: number | null | undefined): string {
    if (!timestamp) return chalk.dim("N/A");
    return new Date(timestamp).toLocaleString();
}
