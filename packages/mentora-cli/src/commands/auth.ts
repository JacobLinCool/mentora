/**
 * Auth commands for CLI authentication
 */
import { Command } from "commander";
import { exec } from "node:child_process";
import ora from "ora";
import { MentoraCLIClient } from "../client.js";
import { deleteConfig, getConfig, setConfig } from "../config.js";
import { createCredential } from "../utils/auth-restore.js";
import { startAuthServer } from "../utils/auth-server.js";
import { error, info, outputData, success } from "../utils/output.js";

function openBrowser(url: string): void {
    const command =
        process.platform === "darwin"
            ? `open "${url}"`
            : process.platform === "win32"
              ? `start "${url}"`
              : `xdg-open "${url}"`;

    exec(command, (err) => {
        if (err) {
            info(`Please open this URL in your browser: ${url}`);
        }
    });
}

export function createAuthCommand(): Command {
    const auth = new Command("auth").description("Manage authentication");

    auth.command("login")
        .description("Login to Mentora using your browser")
        .option(
            "-p, --port <port>",
            "Port for local auth server",
            parseInt,
            9876,
        )
        .action(async (options: { port: number }) => {
            const config = getConfig();

            if (!config.projectId || !config.apiKey) {
                error("Firebase not configured. Run these commands first:");
                info("  mentora config set projectId <your-project-id>");
                info("  mentora config set apiKey <your-api-key>");
                process.exit(1);
            }

            const spinner = ora("Starting authentication server...").start();

            try {
                const url = `http://localhost:${options.port}`;

                spinner.text = "Opening browser for login...";

                // Start server first
                const authPromise = startAuthServer(options.port);

                // Open browser after a small delay
                setTimeout(() => openBrowser(url), 500);

                spinner.text = "Waiting for authentication...";

                // Wait for browser auth
                const authResult = await authPromise;

                spinner.text = "Verifying authentication...";

                // Verify auth and establish session
                const client = new MentoraCLIClient();
                await client.waitForAuth();

                // If we got credentials back (which we should now), use them
                if (authResult.credential) {
                    const credential = createCredential(authResult.credential);
                    if (credential) {
                        await client.signInWithCredential(credential);
                    }
                }

                if (client.isAuthenticated) {
                    spinner.succeed(
                        `Logged in as ${client.user?.email || client.userId}`,
                    );
                    setConfig("authData", JSON.stringify(authResult));
                } else {
                    spinner.warn(
                        "Login completed but session may not have persisted",
                    );
                }
            } catch (err) {
                spinner.fail("Login failed");
                error(err instanceof Error ? err.message : "Unknown error");
                process.exit(1);
            }
        });

    auth.command("logout")
        .description("Logout and clear saved credentials")
        .action(async () => {
            try {
                // Sign out from Firebase
                const client = new MentoraCLIClient();
                await client.waitForAuth();
                if (client.isAuthenticated) {
                    await client.signOut();
                }
                // Also clear the persistence storage
                deleteConfig("authData");
                success("Logged out successfully.");
            } catch {
                // Even if signOut fails, clear local storage
                deleteConfig("authData");
                success("Logged out successfully.");
            }
        });

    auth.command("status")
        .description("Show current authentication status")
        .action(async () => {
            try {
                const client = new MentoraCLIClient();
                await client.waitForAuth();

                if (client.isAuthenticated && client.user) {
                    success(
                        `Logged in as ${client.user.email || client.userId}`,
                    );
                    outputData({
                        email: client.user.email,
                        uid: client.userId,
                        authenticated: true,
                    });
                } else {
                    info(
                        "Not logged in. Run 'mentora auth login' to authenticate.",
                    );
                    outputData({ authenticated: false });
                }
            } catch (err) {
                info(
                    "Not logged in. Run 'mentora auth login' to authenticate.",
                );
                outputData({ authenticated: false });
            }
        });

    return auth;
}
