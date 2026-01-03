/**
 * Mentora CLI - Command Line Interface for Mentora
 */
import { Command } from "commander";
import { MentoraCLIClient } from "./client.js";
import { createAuthCommand } from "./commands/auth.js";
import { createConfigCommand } from "./commands/config.js";
import {
    createAssignmentsCommand,
    createConversationsCommand,
    createCoursesCommand,
    createStreamingCommand,
    createSubmissionsCommand,
    createTopicsCommand,
    createUsersCommand,
    createWalletsCommand,
} from "./commands/index.js";
import { error, setOutputOptions } from "./utils/output.js";

const program = new Command();

program
    .name("mentora")
    .description("Mentora CLI - Interact with Mentora from the command line")
    .version("0.1.0")
    .option("--json", "Output in JSON format")
    .option(
        "--token <token>",
        "Firebase ID token for authentication (overrides stored auth)",
    )
    .hook("preAction", (thisCommand) => {
        const opts = thisCommand.opts();
        setOutputOptions({ json: opts.json });
    });

// Lazy client initialization with async auth support
let clientInstance: MentoraCLIClient | null = null;
let clientInitPromise: Promise<MentoraCLIClient> | null = null;

async function initClient(): Promise<MentoraCLIClient> {
    if (clientInstance?.isAuthenticated) return clientInstance;
    if (clientInitPromise) return clientInitPromise;

    clientInitPromise = (async () => {
        try {
            if (!clientInstance) {
                clientInstance = new MentoraCLIClient();
            }

            // Wait for auth state to be restored from file-based persistence
            await clientInstance.waitForAuth();

            return clientInstance;
        } catch (err) {
            error(
                err instanceof Error
                    ? err.message
                    : "Failed to initialize client",
            );
            process.exit(1);
        }
    })();

    return clientInitPromise;
}

// Async wrapper that ensures auth is initialized
async function getAuthenticatedClient(): Promise<MentoraCLIClient> {
    return initClient();
}

// Register commands
program.addCommand(createAuthCommand());
program.addCommand(createConfigCommand());
program.addCommand(createUsersCommand(getAuthenticatedClient));
program.addCommand(createCoursesCommand(getAuthenticatedClient));
program.addCommand(createTopicsCommand(getAuthenticatedClient));
program.addCommand(createAssignmentsCommand(getAuthenticatedClient));
program.addCommand(createSubmissionsCommand(getAuthenticatedClient));
program.addCommand(createConversationsCommand(getAuthenticatedClient));
program.addCommand(createStreamingCommand(getAuthenticatedClient));
program.addCommand(createWalletsCommand(getAuthenticatedClient));

// Error handling
program.exitOverride((err) => {
    if (
        err.code === "commander.help" ||
        err.code === "commander.helpDisplayed" ||
        err.code === "commander.version"
    ) {
        process.exit(0);
    }
    error(err.message);
    process.exit(err.exitCode);
});

// Parse and run
program
    .parseAsync(process.argv)
    .then(() => {
        process.exit(0);
    })
    .catch((err) => {
        error(err instanceof Error ? err.message : "Unknown error");
        process.exit(1);
    });
