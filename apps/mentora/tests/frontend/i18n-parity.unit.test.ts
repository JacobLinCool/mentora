import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function loadMessages(file: string): Record<string, string> {
    return JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
}

describe("i18n key parity", () => {
    it("keeps en and zh-tw keys in sync", () => {
        const en = loadMessages("../../messages/en.json");
        const zhTw = loadMessages("../../messages/zh-tw.json");

        const enKeys = new Set(
            Object.keys(en).filter((key) => key !== "$schema"),
        );
        const zhTwKeys = new Set(
            Object.keys(zhTw).filter((key) => key !== "$schema"),
        );

        const missingInEn = [...zhTwKeys].filter((key) => !enKeys.has(key));
        const missingInZhTw = [...enKeys].filter((key) => !zhTwKeys.has(key));

        expect(missingInEn).toEqual([]);
        expect(missingInZhTw).toEqual([]);
    });
});
