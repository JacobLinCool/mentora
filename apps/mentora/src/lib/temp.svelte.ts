import { browser } from "$app/environment";

class UserProfileStore {
    isMentor = $state(false);

    constructor() {
        if (browser) {
            this.updateOrientation();
            window.addEventListener("resize", () => this.updateOrientation());
        } else {
            // Default to Mentor/Desktop in SSR if safe, or false.
            // Given the requirements "Computer = Mentor", defaulting to true might be better for SSR SEO/Preview,
            // but defaulting to false (Student) is safer for mobile-first.
            // Let's stick to false or do a best guess.
            this.isMentor = false;
        }
    }

    updateOrientation() {
        this.isMentor = window.innerWidth > window.innerHeight;
    }
}

export const userProfile = new UserProfileStore();
