/**
 * Assignment operations
 */
import {
    addDoc,
    collection,
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
import { Assignments, type Assignment } from "mentora-firebase";
import {
    failure,
    tryCatch,
    type APIResult,
    type MentoraAPIConfig,
    type QueryOptions,
} from "./types";

/**
 * Get an assignment by ID
 */
export async function getAssignment(
    config: MentoraAPIConfig,
    assignmentId: string,
): Promise<APIResult<Assignment>> {
    return tryCatch(async () => {
        const docRef = doc(config.db, Assignments.docPath(assignmentId));
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
            throw new Error("Assignment not found");
        }

        return Assignments.schema.parse(snapshot.data());
    });
}

/**
 * List assignments for a class
 */
export async function listClassAssignments(
    config: MentoraAPIConfig,
    classId: string,
    options?: QueryOptions,
): Promise<APIResult<Assignment[]>> {
    return tryCatch(async () => {
        const constraints: QueryConstraint[] = [
            where("classId", "==", classId),
            orderBy("startAt", "desc"),
        ];

        if (options?.limit) {
            constraints.push(limit(options.limit));
        }

        const q = query(
            collection(config.db, Assignments.collectionPath()),
            ...constraints,
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => Assignments.schema.parse(doc.data()));
    });
}

/**
 * List available assignments for a class (already started)
 */
export async function listAvailableAssignments(
    config: MentoraAPIConfig,
    classId: string,
    options?: QueryOptions,
): Promise<APIResult<Assignment[]>> {
    return tryCatch(async () => {
        const now = Date.now();
        const constraints: QueryConstraint[] = [
            where("classId", "==", classId),
            where("startAt", "<=", now),
            orderBy("startAt", "desc"),
        ];

        if (options?.limit) {
            constraints.push(limit(options.limit));
        }

        const q = query(
            collection(config.db, Assignments.collectionPath()),
            ...constraints,
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => Assignments.schema.parse(doc.data()));
    });
}

/**
 * Create a new assignment
 */
export async function createAssignment(
    config: MentoraAPIConfig,
    assignment: Omit<
        Assignment,
        "id" | "createdBy" | "createdAt" | "updatedAt"
    >,
): Promise<APIResult<string>> {
    const currentUser = config.getCurrentUser();
    if (!currentUser) {
        return failure("Not authenticated");
    }

    return tryCatch(async () => {
        const now = Date.now();
        const assignmentData: Omit<Assignment, "id"> = {
            ...assignment,
            createdBy: currentUser.uid,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await addDoc(
            collection(config.db, Assignments.collectionPath()),
            assignmentData,
        );

        // Update the document with its own ID
        await updateDoc(docRef, { id: docRef.id });

        return docRef.id;
    });
}
