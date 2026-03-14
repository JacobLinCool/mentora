export function getNextLocale(current: string): "en" | "zh-tw" {
    return current === "en" ? "zh-tw" : "en";
}
