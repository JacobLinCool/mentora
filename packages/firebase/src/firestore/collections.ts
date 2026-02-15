import { Announcements } from "./announcements";
import { Assignments } from "./assignments";
import { Conversations } from "./conversations";
import { Courses } from "./courses";
import { AssignmentSubmissions } from "./submissions";
import { Topics } from "./topics";
import { UserProfiles } from "./userProfiles";
import { Wallets } from "./wallets";

export const FirestoreCollections = {
    userProfiles: UserProfiles,
    announcements: Announcements,
    courses: Courses,
    assignments: Assignments,
    conversations: Conversations,
    assignmentSubmissions: AssignmentSubmissions,
    topics: Topics,
    wallets: Wallets,
} as const;
