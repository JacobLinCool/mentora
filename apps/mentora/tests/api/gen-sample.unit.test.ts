import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock $env/static/public – default to emulator disabled
const envMock = { PUBLIC_USE_FIREBASE_EMULATOR: "false" } as Record<
    string,
    string
>;
vi.mock("$env/static/public", () => envMock);

// Mock auth
const requireAuthMock = vi.fn();
vi.mock("$lib/server/auth", () => ({
    requireAuth: requireAuthMock,
}));

// Mock firestore – never hit real Firestore
const collectionMock = vi.fn(() => ({
    doc: vi.fn(() => ({
        set: vi.fn(),
        collection: vi.fn(() => ({
            doc: vi.fn(() => ({ set: vi.fn() })),
        })),
    })),
}));
vi.mock("$lib/server/firestore", () => ({
    firestore: { collection: collectionMock },
}));

describe("/api/gen_sample endpoint", () => {
    function createUnsignedToken(payload: Record<string, unknown>): string {
        const header = Buffer.from(
            JSON.stringify({ alg: "none", typ: "JWT" }),
        ).toString("base64url");
        const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
        return `${header}.${body}.`;
    }

    beforeEach(() => {
        vi.restoreAllMocks();
        envMock.PUBLIC_USE_FIREBASE_EMULATOR = "false";
        requireAuthMock.mockResolvedValue({
            uid: "test-user",
            email: "test@example.com",
            emailVerified: true,
        });
    });

    async function loadHandler() {
        // Dynamic import so vi.mock takes effect per-test
        vi.resetModules();
        const mod = await import("../../src/routes/api/gen_sample/+server");
        return mod.GET;
    }

    function makeEvent(overrides: Record<string, unknown> = {}) {
        return {
            url: new URL("http://localhost/api/gen_sample"),
            request: new Request("http://localhost/api/gen_sample", {
                headers: {
                    Authorization: "Bearer test-token",
                },
            }),
            ...overrides,
        };
    }

    it("rejects requests when emulator mode is disabled (production)", async () => {
        envMock.PUBLIC_USE_FIREBASE_EMULATOR = "false";
        const handler = await loadHandler();

        const response = await handler(makeEvent() as never);
        expect(response.status).toBe(403);

        const body = await response.json();
        expect(body.error).toMatch(/emulator mode/i);
    });

    it("rejects unauthenticated requests even in emulator mode", async () => {
        envMock.PUBLIC_USE_FIREBASE_EMULATOR = "true";
        requireAuthMock.mockRejectedValue(
            new Error("Missing or invalid authorization header"),
        );
        const handler = await loadHandler();

        await expect(handler(makeEvent() as never)).rejects.toThrow();
    });

    it("allows authenticated requests in emulator mode", async () => {
        envMock.PUBLIC_USE_FIREBASE_EMULATOR = "true";
        const handler = await loadHandler();

        const response = await handler(makeEvent() as never);
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.success).toBe(true);
    });

    it("accepts unsigned emulator JWT when strict verification fails", async () => {
        envMock.PUBLIC_USE_FIREBASE_EMULATOR = "true";
        requireAuthMock.mockRejectedValue(
            new Error("Invalid or expired token"),
        );
        const handler = await loadHandler();

        const emulatorToken = createUnsignedToken({
            sub: "emu-user",
            user_id: "emu-user",
            email: "emu@example.com",
            email_verified: true,
        });
        const response = await handler(
            makeEvent({
                request: new Request("http://localhost/api/gen_sample", {
                    headers: {
                        Authorization: `Bearer ${emulatorToken}`,
                    },
                }),
            }) as never,
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
    });
});
