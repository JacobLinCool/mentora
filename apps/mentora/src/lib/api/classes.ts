/**
 * Class management operations
 */
import {
    addDoc,
    collection,
    collectionGroup,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    updateDoc,
    where,
    type QueryConstraint,
} from "firebase/firestore";
import { Classes, type ClassDoc, type ClassMembership } from "mentora-firebase";
import {
    failure,
    tryCatch,
    type APIResult,
    type MentoraAPIConfig,
    type QueryOptions,
} from "./types";

/**
 * Get a class by ID
 */
export async function getClass(
    config: MentoraAPIConfig,
    classId: string,
): Promise<APIResult<ClassDoc>> {
    return tryCatch(async () => {
        const docRef = doc(config.db, Classes.docPath(classId));
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
            throw new Error("Class not found");
        }

        return Classes.schema.parse(snapshot.data());
    });
}

/**
 * List classes owned by current user
 */
export async function listMyClasses(
    config: MentoraAPIConfig,
    options?: QueryOptions,
): Promise<APIResult<ClassDoc[]>> {
    const currentUser = config.getCurrentUser();
    if (!currentUser) {
        return failure("Not authenticated");
    }

    return tryCatch(async () => {
        const constraints: QueryConstraint[] = [
            where("ownerId", "==", currentUser.uid),
            orderBy("createdAt", "desc"),
        ];

        if (options?.limit) {
            constraints.push(limit(options.limit));
        }

        const q = query(
            collection(config.db, Classes.collectionPath()),
            ...constraints,
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => Classes.schema.parse(doc.data()));
    });
}

/**
 * List classes where current user is a member
 */
export async function listMyEnrolledClasses(
    config: MentoraAPIConfig,
    options?: QueryOptions,
): Promise<APIResult<ClassDoc[]>> {
    const currentUser = config.getCurrentUser();
    if (!currentUser) {
        return failure("Not authenticated");
    }

    return tryCatch(async () => {
        // Query roster collection group
        const q = query(
            collectionGroup(config.db, "roster"),
            where("userId", "==", currentUser.uid),
            where("status", "==", "active"),
            orderBy("joinedAt", "desc"),
            ...(options?.limit ? [limit(options.limit)] : []),
        );

        const snapshot = await getDocs(q);
        const classIds = snapshot.docs.map((doc) => {
            const parts = doc.ref.path.split("/");
            return parts[1]; // classes/{classId}/roster/{memberId}
        });

        // Fetch each class document
        const classes: ClassDoc[] = [];
        for (const classId of classIds) {
            const result = await getClass(config, classId);
            if (result.success) {
                classes.push(result.data);
            }
        }

        return classes;
    });
}

/**
 * Create a new class
 */
export async function createClass(
    config: MentoraAPIConfig,
    title: string,
    code: string,
): Promise<APIResult<string>> {
    const currentUser = config.getCurrentUser();
    if (!currentUser) {
        return failure("Not authenticated");
    }

    return tryCatch(async () => {
        const now = Date.now();
        const classData: Omit<ClassDoc, "id"> = {
            title,
            code,
            ownerId: currentUser.uid,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await addDoc(
            collection(config.db, Classes.collectionPath()),
            classData,
        );

        // Update the document with its own ID
        await updateDoc(docRef, { id: docRef.id });

        return docRef.id;
    });
}

/**
 * Get class roster
 */
export async function getClassRoster(
    config: MentoraAPIConfig,
    classId: string,
    options?: QueryOptions,
): Promise<APIResult<ClassMembership[]>> {
    return tryCatch(async () => {
        const constraints: QueryConstraint[] = [];

        if (options?.where) {
            for (const w of options.where) {
                constraints.push(where(w.field, w.op, w.value));
            }
        }

        if (options?.orderBy) {
            constraints.push(
                orderBy(
                    options.orderBy.field,
                    options.orderBy.direction || "asc",
                ),
            );
        }

        if (options?.limit) {
            constraints.push(limit(options.limit));
        }

        const q = query(
            collection(config.db, Classes.roster.collectionPath(classId)),
            ...constraints,
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) =>
            Classes.roster.schema.parse(doc.data()),
        );
    });
}
