import { defineConfig } from "playwright/test";

export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 60_000,
    retries: 0,
    use: {
        baseURL: "http://localhost:5173",
        video: "on",
        viewport: { width: 1280, height: 720 },
        actionTimeout: 10_000,
    },
    projects: [
        {
            name: "chromium",
            use: { browserName: "chromium" },
        },
    ],
    reporter: [["html", { open: "never" }]],
    outputDir: "./test-results",
});
