import { openAssignmentTarget } from "$lib/features/course/navigation";
import { describe, expect, it, vi } from "vitest";

describe("openAssignmentTarget", () => {
    it("routes questionnaires directly", async () => {
        const api = {
            conversations: {
                getForAssignment: vi.fn(),
                create: vi.fn(),
            },
            submissions: {
                start: vi.fn(),
            },
        };

        const target = await openAssignmentTarget(api, {
            assignmentId: "q-1",
            type: "questionnaire",
        });

        expect(target).toEqual({
            kind: "questionnaire",
            route: "/questionnaires/[id]",
            params: { id: "q-1" },
        });
        expect(api.conversations.getForAssignment).not.toHaveBeenCalled();
    });

    it("reuses existing conversation when present", async () => {
        const api = {
            conversations: {
                getForAssignment: vi
                    .fn()
                    .mockResolvedValue({ success: true, data: { id: "c-1" } }),
                create: vi.fn(),
            },
            submissions: {
                start: vi.fn(),
            },
        };

        const target = await openAssignmentTarget(api, {
            assignmentId: "a-1",
            type: "conversation",
        });

        expect(target).toEqual({
            kind: "conversation",
            route: "/conversations/[id]",
            params: { id: "c-1" },
        });
        expect(api.conversations.create).not.toHaveBeenCalled();
    });

    it("creates a conversation and starts submission when absent", async () => {
        const api = {
            conversations: {
                getForAssignment: vi.fn().mockResolvedValue({ success: false }),
                create: vi
                    .fn()
                    .mockResolvedValue({ success: true, data: { id: "c-2" } }),
            },
            submissions: {
                start: vi.fn().mockResolvedValue(undefined),
            },
        };

        const target = await openAssignmentTarget(api, {
            assignmentId: "a-2",
            type: "assignment",
        });

        expect(target).toEqual({
            kind: "conversation",
            route: "/conversations/[id]",
            params: { id: "c-2" },
        });
        expect(api.submissions.start).toHaveBeenCalledWith("a-2");
    });

    it("returns course route when preferCourseRoute is set", async () => {
        const api = {
            conversations: {
                getForAssignment: vi.fn(),
                create: vi.fn(),
            },
            submissions: {
                start: vi.fn(),
            },
        };

        const target = await openAssignmentTarget(api, {
            assignmentId: "a-3",
            type: "assignment",
            courseId: "course-1",
            preferCourseRoute: true,
        });

        expect(target).toEqual({
            kind: "course",
            route: "/courses/[id]",
            params: { id: "course-1" },
        });
    });
});
