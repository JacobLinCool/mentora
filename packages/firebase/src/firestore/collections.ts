import { Assignments } from "./assignments";
import { Classes } from "./classes";
import { Conversations } from "./conversations";
import { AssignmentSubmissions } from "./submissions";
import { UserProfiles } from "./userProfiles";

export const FirestoreCollections = {
    userProfiles: UserProfiles,
    classes: Classes,
    assignments: Assignments,
    conversations: Conversations,
    assignmentSubmissions: AssignmentSubmissions,
} as const;
