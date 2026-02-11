export const userProfile = $state({ isMentor: true });

export function setMentorMode(isMentor: boolean) {
    userProfile.isMentor = isMentor;
}
