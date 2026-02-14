type AssignmentKind =
    | "questionnaire"
    | "assignment"
    | "dialogue"
    | "conversation";

type ApiResult<T> = {
    success: boolean;
    data?: T;
};

type ConversationsApi = {
    getForAssignment: (
        assignmentId: string,
    ) => Promise<ApiResult<{ id?: string }>>;
    create: (assignmentId: string) => Promise<ApiResult<{ id?: string }>>;
};

type SubmissionsApi = {
    start: (assignmentId: string) => Promise<unknown>;
};

export interface CourseNavigationApi {
    conversations: ConversationsApi;
    submissions: SubmissionsApi;
}

export interface AssignmentNavigationInput {
    assignmentId: string;
    type?: AssignmentKind | string;
    courseId?: string | null;
    preferCourseRoute?: boolean;
}

export interface RouteTarget {
    kind: "course" | "questionnaire" | "conversation";
    route: "/courses/[id]" | "/questionnaires/[id]" | "/conversations/[id]";
    params: { id: string };
}

function toCourseHref(courseId: string): RouteTarget {
    return {
        kind: "course",
        route: "/courses/[id]",
        params: { id: courseId },
    };
}

function toQuestionnaireHref(assignmentId: string): RouteTarget {
    return {
        kind: "questionnaire",
        route: "/questionnaires/[id]",
        params: { id: assignmentId },
    };
}

function toConversationHref(conversationId: string): RouteTarget {
    return {
        kind: "conversation",
        route: "/conversations/[id]",
        params: { id: conversationId },
    };
}

export async function openAssignmentTarget(
    api: CourseNavigationApi,
    input: AssignmentNavigationInput,
): Promise<RouteTarget | null> {
    const { assignmentId, type, courseId, preferCourseRoute = false } = input;

    if (!assignmentId) return null;

    if (preferCourseRoute && courseId) {
        return toCourseHref(courseId);
    }

    if (type === "questionnaire") {
        return toQuestionnaireHref(assignmentId);
    }

    const existing = await api.conversations.getForAssignment(assignmentId);
    if (existing.success && existing.data?.id) {
        return toConversationHref(existing.data.id);
    }

    const created = await api.conversations.create(assignmentId);
    if (created.success && created.data?.id) {
        await api.submissions.start(assignmentId).catch(() => undefined);
        return toConversationHref(created.data.id);
    }

    return null;
}
