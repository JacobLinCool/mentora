/**
 * User profile operations
 */
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { UserProfiles, type UserProfile } from "mentora-firebase";
import type { ReactiveState } from "./state.svelte";
import {
    failure,
    tryCatch,
    type APIResult,
    type MentoraAPIConfig,
} from "./types";

/**
 * Get current user's profile
 */
export async function getMyProfile(
    config: MentoraAPIConfig,
): Promise<APIResult<UserProfile>> {
    const currentUser = config.getCurrentUser();
    if (!currentUser) {
        return failure("Not authenticated");
    }

    return tryCatch(async () => {
        const docRef = doc(config.db, UserProfiles.docPath(currentUser.uid));
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
            throw new Error("Profile not found");
        }

        return UserProfiles.schema.parse(snapshot.data());
    });
}

/**
 * Get a user profile by UID
 */
export async function getUserProfile(
    config: MentoraAPIConfig,
    uid: string,
): Promise<APIResult<UserProfile>> {
    return tryCatch(async () => {
        const docRef = doc(config.db, UserProfiles.docPath(uid));
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
            throw new Error("Profile not found");
        }

        return UserProfiles.schema.parse(snapshot.data());
    });
}

/**
 * Create or update user profile
 */
export async function updateMyProfile(
    config: MentoraAPIConfig,
    profile: Partial<Omit<UserProfile, "uid" | "createdAt">>,
): Promise<APIResult<void>> {
    const currentUser = config.getCurrentUser();
    if (!currentUser) {
        return failure("Not authenticated");
    }

    return tryCatch(async () => {
        const docRef = doc(config.db, UserProfiles.docPath(currentUser.uid));
        const snapshot = await getDoc(docRef);
        const now = Date.now();

        if (!snapshot.exists()) {
            // Create new profile with all required fields
            await setDoc(docRef, {
                uid: currentUser.uid,
                displayName:
                    profile.displayName ||
                    currentUser.displayName ||
                    currentUser.email?.split("@")[0] ||
                    "User",
                email: profile.email || currentUser.email || "",
                photoURL:
                    profile.photoURL !== undefined
                        ? profile.photoURL
                        : currentUser.photoURL,
                createdAt: now,
                updatedAt: now,
            });
        } else {
            // Update existing profile
            await setDoc(
                docRef,
                {
                    ...profile,
                    updatedAt: now,
                },
                { merge: true },
            );
        }
    });
}

/**
 * Subscribe to current user's profile changes
 */
export function subscribeToMyProfile(
    config: MentoraAPIConfig,
    state: ReactiveState<UserProfile>,
): void {
    const currentUser = config.getCurrentUser();
    if (!currentUser) {
        state.setError("Not authenticated");
        return;
    }

    state.setLoading(true);
    const docRef = doc(config.db, UserProfiles.docPath(currentUser.uid));

    const unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
            if (snapshot.exists()) {
                try {
                    const data = UserProfiles.schema.parse(snapshot.data());
                    state.set(data);
                    state.setError(null);
                } catch (error) {
                    state.setError(
                        error instanceof Error ? error.message : "Parse error",
                    );
                }
            } else {
                state.setError("Profile not found");
            }
            state.setLoading(false);
        },
        (error) => {
            state.setError(error.message);
            state.setLoading(false);
        },
    );

    state.attachUnsubscribe(unsubscribe);
}
