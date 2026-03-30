import { expect, test, type Page } from "playwright/test";
import { createFreshToken, seedGradingData, type SeedResult } from "./seed";

let seed: SeedResult;

/**
 * Inject Firebase Auth state into the browser's IndexedDB so the
 * app recognizes the user as signed in on page load.
 */
async function injectAuthState(
    page: Page,
    uid: string,
    email: string,
    token: string,
    refreshToken: string,
) {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.evaluate(
        async ({ uid, email, token, refreshToken }) => {
            const API_KEY = "AIzaSyCMXQsEdCKChh-D_tfxWz6RBXzlO8q04ew";
            const APP_NAME = "[DEFAULT]";
            const DB_NAME = "firebaseLocalStorageDb";
            const STORE_NAME = "firebaseLocalStorage";
            const KEY = `firebase:authUser:${API_KEY}:${APP_NAME}`;

            const userObj = {
                uid,
                email,
                emailVerified: false,
                displayName: email.split("@")[0],
                isAnonymous: false,
                providerData: [
                    {
                        providerId: "password",
                        uid: email,
                        displayName: null,
                        email,
                        phoneNumber: null,
                        photoURL: null,
                    },
                ],
                stsTokenManager: {
                    refreshToken,
                    accessToken: token,
                    expirationTime: Date.now() + 3600 * 1000,
                },
                createdAt: String(Date.now()),
                lastLoginAt: String(Date.now()),
                apiKey: API_KEY,
                appName: APP_NAME,
            };

            return new Promise<void>((resolve, reject) => {
                const req = indexedDB.open(DB_NAME, 1);
                req.onupgradeneeded = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                };
                req.onsuccess = () => {
                    const db = req.result;
                    const tx = db.transaction(STORE_NAME, "readwrite");
                    const store = tx.objectStore(STORE_NAME);
                    store.put({ fbase_key: KEY, value: userObj }, KEY);
                    tx.oncomplete = () => {
                        db.close();
                        resolve();
                    };
                    tx.onerror = () => reject(tx.error);
                };
                req.onerror = () => reject(req.error);
            });
        },
        { uid, email, token, refreshToken },
    );

    await page.reload();
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);
}

test.beforeAll(async () => {
    seed = await seedGradingData();
});

test.describe("Grading Modal", () => {
    test("shows enhanced grading UI with assessment and conversation", async ({
        page,
    }) => {
        const { token, refreshToken } = await createFreshToken(
            seed.mentor.email,
        );

        await injectAuthState(
            page,
            seed.mentor.uid,
            seed.mentor.email,
            token,
            refreshToken,
        );

        // Navigate to the course
        await page.goto(`/courses/${seed.courseId}`);
        await page.waitForLoadState("load");
        await page.waitForTimeout(2000);

        // Verify we see the mentor view
        await expect(page.getByText("E2E Test Course")).toBeVisible({
            timeout: 15000,
        });

        // Click 提交管理 (Submissions) tab
        await page
            .locator("nav button")
            .filter({ hasText: "提交管理" })
            .click();
        await page.waitForTimeout(1000);

        // Select the assignment from dropdown
        const select = page.locator("select").first();
        await select.waitFor({ state: "visible", timeout: 5000 });

        const options = select.locator("option");
        const count = await options.count();
        for (let i = 0; i < count; i++) {
            const text = await options.nth(i).textContent();
            if (text && text.includes("AI Ethics Debate")) {
                await select.selectOption({ index: i });
                break;
            }
        }
        await page.waitForTimeout(1000);

        // Should see at least one submission row with 評分 button
        const gradeBtn = page
            .locator("button")
            .filter({ hasText: "評分" })
            .first();
        await expect(gradeBtn).toBeVisible({ timeout: 5000 });

        // Click 評分 (Grade) button
        await gradeBtn.click();

        // Wait for modal to load data
        await page.waitForTimeout(3000);

        // Screenshot the grading modal
        await page.screenshot({
            path: "test-results/grading-modal.png",
        });

        // Verify AI 評估 (AI Assessment) section
        await expect(page.getByText("AI 評估")).toBeVisible({ timeout: 5000 });

        // Verify dimension labels (zh-tw)
        await expect(page.getByText("論點品質")).toBeVisible();
        await expect(page.getByText("批判思考")).toBeVisible();
        await expect(page.getByText("開放性")).toBeVisible();
        await expect(page.getByText("連貫性")).toBeVisible();
        await expect(page.getByText("原則提取")).toBeVisible();

        // Verify score indicators (4/5, 5/5, 3/5)
        await expect(page.getByText("4/5").first()).toBeVisible();
        await expect(page.getByText("5/5").first()).toBeVisible();
        await expect(page.getByText("3/5").first()).toBeVisible();

        // Verify 總分 (Overall)
        await expect(page.getByText("總分")).toBeVisible();

        // Verify 對話紀錄 (Conversation) section with turns
        await expect(page.getByText("對話紀錄")).toBeVisible();
        await expect(page.getByText(/AI should be regulated/i)).toBeVisible();

        // Verify grading form inputs exist
        await expect(page.locator("input#grade-score")).toBeVisible();
        await expect(page.locator("textarea#grade-notes")).toBeVisible();

        // Fill in a grade to demonstrate functionality
        await page.locator("input#grade-score").fill("85");
        await page
            .locator("textarea#grade-notes")
            .fill("Great discussion on AI ethics.");

        // Final screenshot with grade filled in
        await page.screenshot({
            path: "test-results/grading-modal-filled.png",
        });
    });
});
