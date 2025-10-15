/**
 * Class management operations
 */
import {
    collection,
    collectionGroup,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    runTransaction,
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
 * Creates both the class document and the owner's roster entry atomically
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

        // Pre-generate document reference to get the ID
        const classRef = doc(collection(config.db, Classes.collectionPath()));
        const classId = classRef.id;

        // Use transaction to ensure atomicity
        await runTransaction(config.db, async (transaction) => {
            // Create class document
            const classData: ClassDoc = {
                id: classId,
                title,
                code,
                ownerId: currentUser.uid,
                createdAt: now,
                updatedAt: now,
            };
            transaction.set(classRef, classData);

            // Create owner's roster entry as instructor
            const rosterRef = doc(
                config.db,
                Classes.roster.docPath(classId, currentUser.uid),
            );
            const rosterData: ClassMembership = {
                userId: currentUser.uid,
                email: currentUser.email || "",
                role: "instructor",
                status: "active",
                joinedAt: now,
            };
            transaction.set(rosterRef, rosterData);
        });

        return classId;
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
