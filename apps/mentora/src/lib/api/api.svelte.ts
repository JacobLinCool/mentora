/**
 * Mentora Client-Side API
 * - Managing authentication state
 * - Interacting with Firestore collections
 * - Calling backend endpoints
 */
import { browser } from "$app/environment";
import { auth, db } from "$lib/firebase";
import type { User } from "firebase/auth";
import type {
    Assignment,
    ClassDoc,
    ClassMembership,
    Conversation,
    Submission,
    UserProfile,
} from "mentora-firebase";
import * as AssignmentsModule from "./assignments";
import * as BackendModule from "./backend";
import * as ClassesModule from "./classes";
import * as ConversationsModule from "./conversations";
import type { ReactiveState } from "./state.svelte";
import { createState } from "./state.svelte";
import * as SubmissionsModule from "./submissions";
import type { APIResult, MentoraAPIConfig, QueryOptions } from "./types";
import * as UsersModule from "./users";

export type {
    Assignment,
    ClassDoc,
    ClassMembership,
    Conversation,
    Submission,
    Turn,
    UserProfile,
} from "mentora-firebase";
export { createState, ReactiveState } from "./state.svelte";
export type { APIResult, MentoraAPIConfig, QueryOptions } from "./types";

class MentoraAPI {
    #currentUser = $state<User | null>(null);
    private config: MentoraAPIConfig;

    constructor(config: Omit<MentoraAPIConfig, "getCurrentUser">) {
        this.config = {
            ...config,
            getCurrentUser: () => this.#currentUser,
        };

        if (browser) {
            auth.onAuthStateChanged((user) => {
                this.#currentUser = user;
            });
        }
    }

    get ready() {
        return auth.authStateReady();
    }

    get currentUser() {
        return this.#currentUser;
    }

    get isAuthenticated() {
        return this.#currentUser !== null;
    }

    private async readyThen<T>(fn: () => Promise<T>): Promise<T> {
        await this.ready;
        return fn();
    }

    users = {
        getMyProfile: (): Promise<APIResult<UserProfile>> =>
            this.readyThen(() => UsersModule.getMyProfile(this.config)),
        getProfile: (uid: string): Promise<APIResult<UserProfile>> =>
            this.readyThen(() => UsersModule.getUserProfile(this.config, uid)),
        updateMyProfile: (
            profile: Partial<Omit<UserProfile, "uid" | "createdAt">>,
        ): Promise<APIResult<void>> =>
            this.readyThen(() =>
                UsersModule.updateMyProfile(this.config, profile),
            ),
        subscribeToMyProfile: (state: ReactiveState<UserProfile>): void =>
            UsersModule.subscribeToMyProfile(this.config, state),
    };

    classes = {
        get: (classId: string): Promise<APIResult<ClassDoc>> =>
            this.readyThen(() => ClassesModule.getClass(this.config, classId)),
        listMine: (options?: QueryOptions): Promise<APIResult<ClassDoc[]>> =>
            this.readyThen(() =>
                ClassesModule.listMyClasses(this.config, options),
            ),
        listEnrolled: (
            options?: QueryOptions,
        ): Promise<APIResult<ClassDoc[]>> =>
            this.readyThen(() =>
                ClassesModule.listMyEnrolledClasses(this.config, options),
            ),
        create: (title: string, code: string): Promise<APIResult<string>> =>
            this.readyThen(() =>
                ClassesModule.createClass(this.config, title, code),
            ),
        getRoster: (
            classId: string,
            options?: QueryOptions,
        ): Promise<APIResult<ClassMembership[]>> =>
            this.readyThen(() =>
                ClassesModule.getClassRoster(this.config, classId, options),
            ),
        joinByCode: (code: string): Promise<APIResult<string>> =>
            this.readyThen(() =>
                BackendModule.joinClassByCode(this.config, code),
            ),
    };

    assignments = {
        get: (assignmentId: string): Promise<APIResult<Assignment>> =>
            this.readyThen(() =>
                AssignmentsModule.getAssignment(this.config, assignmentId),
            ),
        listForClass: (
            classId: string,
            options?: QueryOptions,
        ): Promise<APIResult<Assignment[]>> =>
            this.readyThen(() =>
                AssignmentsModule.listClassAssignments(
                    this.config,
                    classId,
                    options,
                ),
            ),
        listAvailable: (
            classId: string,
            options?: QueryOptions,
        ): Promise<APIResult<Assignment[]>> =>
            this.readyThen(() =>
                AssignmentsModule.listAvailableAssignments(
                    this.config,
                    classId,
                    options,
                ),
            ),
        create: (
            assignment: Omit<
                Assignment,
                "id" | "createdBy" | "createdAt" | "updatedAt"
            >,
        ): Promise<APIResult<string>> =>
            this.readyThen(() =>
                AssignmentsModule.createAssignment(this.config, assignment),
            ),
    };

    submissions = {
        get: (
            assignmentId: string,
            userId: string,
        ): Promise<APIResult<Submission>> =>
            this.readyThen(() =>
                SubmissionsModule.getSubmission(
                    this.config,
                    assignmentId,
                    userId,
                ),
            ),
        getMine: (assignmentId: string): Promise<APIResult<Submission>> =>
            this.readyThen(() =>
                SubmissionsModule.getMySubmission(this.config, assignmentId),
            ),
        listForAssignment: (
            assignmentId: string,
            options?: QueryOptions,
        ): Promise<APIResult<Submission[]>> =>
            this.readyThen(() =>
                SubmissionsModule.listAssignmentSubmissions(
                    this.config,
                    assignmentId,
                    options,
                ),
            ),
        start: (assignmentId: string): Promise<APIResult<void>> =>
            this.readyThen(() =>
                SubmissionsModule.startSubmission(this.config, assignmentId),
            ),
        submit: (assignmentId: string): Promise<APIResult<void>> =>
            this.readyThen(() =>
                SubmissionsModule.submitAssignment(this.config, assignmentId),
            ),
    };

    conversations = {
        get: (conversationId: string): Promise<APIResult<Conversation>> =>
            this.readyThen(() =>
                ConversationsModule.getConversation(
                    this.config,
                    conversationId,
                ),
            ),
        getForAssignment: (
            assignmentId: string,
            userId?: string,
        ): Promise<APIResult<Conversation>> =>
            this.readyThen(() =>
                ConversationsModule.getAssignmentConversation(
                    this.config,
                    assignmentId,
                    userId,
                ),
            ),
        subscribe: (
            conversationId: string,
            state: ReactiveState<Conversation>,
        ): void =>
            ConversationsModule.subscribeToConversation(
                this.config,
                conversationId,
                state,
            ),
    };

    backend = {
        call: <T>(
            endpoint: string,
            options?: RequestInit,
        ): Promise<APIResult<T>> =>
            this.readyThen(() =>
                BackendModule.callBackend<T>(this.config, endpoint, options),
            ),
    };

    // Utility methods
    createState<T>(): ReactiveState<T> {
        return createState<T>();
    }
}

export const api = new MentoraAPI({
    db,
    backendBaseUrl: "/api",
});
