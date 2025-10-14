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
import { ProfileWatcher } from "./profile.svelte";
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
    #profileWatcher: ProfileWatcher;
    private config: MentoraAPIConfig;

    constructor(config: Omit<MentoraAPIConfig, "getCurrentUser">) {
        this.config = {
            ...config,
            getCurrentUser: () => this.#currentUser,
        };

        this.#profileWatcher = new ProfileWatcher(this.config);

        if (browser) {
            auth.onAuthStateChanged((user) => {
                this.#currentUser = user;
                this.#profileWatcher.handleUserChange(user);
            });
        }
    }

    get profileReady(): Promise<void> {
        return this.#profileWatcher.ready;
    }

    get authReady() {
        return auth.authStateReady();
    }

    get currentUser() {
        return this.#currentUser;
    }

    get currentUserProfile() {
        return this.#profileWatcher.profile;
    }

    get isAuthenticated() {
        return this.#currentUser !== null;
    }

    private async authReadyThen<T>(fn: () => Promise<T>): Promise<T> {
        await this.authReady;
        return fn();
    }

    users = {
        getMyProfile: (): Promise<APIResult<UserProfile>> =>
            this.authReadyThen(() => UsersModule.getMyProfile(this.config)),
        getProfile: (uid: string): Promise<APIResult<UserProfile>> =>
            this.authReadyThen(() =>
                UsersModule.getUserProfile(this.config, uid),
            ),
        updateMyProfile: (
            profile: Partial<Omit<UserProfile, "uid" | "createdAt">>,
        ): Promise<APIResult<void>> =>
            this.authReadyThen(() =>
                UsersModule.updateMyProfile(this.config, profile),
            ),
        subscribeToMyProfile: (state: ReactiveState<UserProfile>): void =>
            UsersModule.subscribeToMyProfile(this.config, state),
    };

    classes = {
        get: (classId: string): Promise<APIResult<ClassDoc>> =>
            this.authReadyThen(() =>
                ClassesModule.getClass(this.config, classId),
            ),
        listMine: (options?: QueryOptions): Promise<APIResult<ClassDoc[]>> =>
            this.authReadyThen(() =>
                ClassesModule.listMyClasses(this.config, options),
            ),
        listEnrolled: (
            options?: QueryOptions,
        ): Promise<APIResult<ClassDoc[]>> =>
            this.authReadyThen(() =>
                ClassesModule.listMyEnrolledClasses(this.config, options),
            ),
        create: (title: string, code: string): Promise<APIResult<string>> =>
            this.authReadyThen(() =>
                ClassesModule.createClass(this.config, title, code),
            ),
        getRoster: (
            classId: string,
            options?: QueryOptions,
        ): Promise<APIResult<ClassMembership[]>> =>
            this.authReadyThen(() =>
                ClassesModule.getClassRoster(this.config, classId, options),
            ),
        joinByCode: (code: string): Promise<APIResult<string>> =>
            this.authReadyThen(() =>
                BackendModule.joinClassByCode(this.config, code),
            ),
    };

    assignments = {
        get: (assignmentId: string): Promise<APIResult<Assignment>> =>
            this.authReadyThen(() =>
                AssignmentsModule.getAssignment(this.config, assignmentId),
            ),
        listForClass: (
            classId: string,
            options?: QueryOptions,
        ): Promise<APIResult<Assignment[]>> =>
            this.authReadyThen(() =>
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
            this.authReadyThen(() =>
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
            this.authReadyThen(() =>
                AssignmentsModule.createAssignment(this.config, assignment),
            ),
    };

    submissions = {
        get: (
            assignmentId: string,
            userId: string,
        ): Promise<APIResult<Submission>> =>
            this.authReadyThen(() =>
                SubmissionsModule.getSubmission(
                    this.config,
                    assignmentId,
                    userId,
                ),
            ),
        getMine: (assignmentId: string): Promise<APIResult<Submission>> =>
            this.authReadyThen(() =>
                SubmissionsModule.getMySubmission(this.config, assignmentId),
            ),
        listForAssignment: (
            assignmentId: string,
            options?: QueryOptions,
        ): Promise<APIResult<Submission[]>> =>
            this.authReadyThen(() =>
                SubmissionsModule.listAssignmentSubmissions(
                    this.config,
                    assignmentId,
                    options,
                ),
            ),
        start: (assignmentId: string): Promise<APIResult<void>> =>
            this.authReadyThen(() =>
                SubmissionsModule.startSubmission(this.config, assignmentId),
            ),
        submit: (assignmentId: string): Promise<APIResult<void>> =>
            this.authReadyThen(() =>
                SubmissionsModule.submitAssignment(this.config, assignmentId),
            ),
    };

    conversations = {
        get: (conversationId: string): Promise<APIResult<Conversation>> =>
            this.authReadyThen(() =>
                ConversationsModule.getConversation(
                    this.config,
                    conversationId,
                ),
            ),
        getForAssignment: (
            assignmentId: string,
            userId?: string,
        ): Promise<APIResult<Conversation>> =>
            this.authReadyThen(() =>
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
            this.authReadyThen(() =>
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
