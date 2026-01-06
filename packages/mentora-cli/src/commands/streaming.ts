/**
 * Streaming commands for CLI
 *
 * Provides interactive text-based streaming conversation for testing
 * and development purposes.
 */
import { Command } from "commander";
import * as readline from "readline";
import type { MentoraCLIClient } from "../client.js";
import { error, info, success, warn } from "../utils/output.js";

/**
 * Simple streaming client for CLI (text-only, no audio)
 */
class CLIStreamingSession {
    private client: MentoraCLIClient;
    private conversationId: string;
    private rl: readline.Interface;
    private isConnected = false;
    private isWaitingForAI = false;
    private currentAIResponse = "";

    constructor(client: MentoraCLIClient, conversationId: string) {
        this.client = client;
        this.conversationId = conversationId;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
    }

    async start(): Promise<void> {
        info(`Starting conversation session: ${this.conversationId}`);
        info('Type your messages and press Enter. Type "/quit" to exit.\n');

        // For CLI, we'll use the REST API for turn-by-turn interaction
        // since WebSocket requires browser environment
        await this.runInteractiveLoop();
    }

    private async runInteractiveLoop(): Promise<void> {
        while (true) {
            const input = await this.promptUser("\n📝 You: ");

            if (
                input.toLowerCase() === "/quit" ||
                input.toLowerCase() === "/exit"
            ) {
                info("Ending conversation...");
                break;
            }

            if (input.toLowerCase() === "/status") {
                await this.showStatus();
                continue;
            }

            if (input.toLowerCase() === "/history") {
                await this.showHistory();
                continue;
            }

            if (input.toLowerCase() === "/help") {
                this.showHelp();
                continue;
            }

            if (!input.trim()) {
                warn("Please enter a message or command.");
                continue;
            }

            // Send message and get AI response
            await this.sendMessage(input);
        }

        this.rl.close();
    }

    private async sendMessage(text: string): Promise<void> {
        this.isWaitingForAI = true;
        process.stdout.write("\n🤖 AI: ");

        try {
            // Use REST API to add turn
            // TODO: Mock endpoint - will be replaced with real AI implementation
            const result = await this.client.backend.call<{
                userTurn: { id: string; text: string };
                aiTurn: {
                    id: string;
                    text: string;
                    analysis?: { strategy?: string };
                };
                state: string;
            }>(`/api/conversations/${this.conversationId}/turns`, {
                method: "POST",
                body: JSON.stringify({ text, type: "idea" }),
            });

            if (result.success) {
                // Simulate streaming by printing character by character
                await this.simulateStreaming(result.data.aiTurn.text);

                if (result.data.aiTurn.analysis?.strategy) {
                    info(
                        `\n[Strategy: ${result.data.aiTurn.analysis.strategy}]`,
                    );
                }

                if (result.data.state === "closed") {
                    info("\n✅ Conversation has been concluded.");
                }
            } else {
                error(`Failed to send message: ${result.error}`);
            }
        } catch (err) {
            error(
                `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
            );
        } finally {
            this.isWaitingForAI = false;
        }
    }

    private async simulateStreaming(text: string): Promise<void> {
        const words = text.split(" ");
        for (let i = 0; i < words.length; i++) {
            process.stdout.write(words[i]);
            if (i < words.length - 1) {
                process.stdout.write(" ");
            }
            // Small delay to simulate streaming
            await new Promise((resolve) => setTimeout(resolve, 30));
        }
        console.log();
    }

    private async showStatus(): Promise<void> {
        const result = await this.client.conversations.get(this.conversationId);
        if (result.success) {
            info(`\n📊 Status: ${result.data.state}`);
            info(`Total turns: ${result.data.turns.length}`);
            info(
                `Last activity: ${new Date(result.data.lastActionAt).toLocaleString()}`,
            );
        } else {
            error(`Failed to get status: ${result.error}`);
        }
    }

    private async showHistory(): Promise<void> {
        const result = await this.client.conversations.get(this.conversationId);
        if (result.success) {
            info("\n📜 Conversation History:\n");
            for (const turn of result.data.turns) {
                const prefix = ["idea", "followup"].includes(turn.type)
                    ? "📝 You"
                    : "🤖 AI";
                console.log(`${prefix}: ${turn.text}\n`);
            }
        } else {
            error(`Failed to get history: ${result.error}`);
        }
    }

    private showHelp(): void {
        info("\n📖 Available Commands:");
        info("  /status  - Show conversation status");
        info("  /history - Show conversation history");
        info("  /help    - Show this help message");
        info("  /quit    - End the conversation");
    }

    private promptUser(prompt: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(prompt, (answer) => {
                resolve(answer);
            });
        });
    }
}

export function createStreamingCommand(
    getClient: () => Promise<MentoraCLIClient>,
): Command {
    const streaming = new Command("stream").description(
        "Interactive streaming conversation",
    );

    streaming
        .command("start")
        .description("Start an interactive conversation session")
        .argument("<conversationId>", "Conversation ID to connect to")
        .action(async (conversationId: string) => {
            const client = await getClient();

            // Verify conversation exists
            const convResult = await client.conversations.get(conversationId);
            if (!convResult.success) {
                error(`Failed to get conversation: ${convResult.error}`);
                process.exit(1);
            }

            if (convResult.data.state === "closed") {
                error("This conversation has already ended.");
                process.exit(1);
            }

            const session = new CLIStreamingSession(client, conversationId);
            await session.start();
        });

    streaming
        .command("new")
        .description("Create a new conversation and start streaming")
        .argument("<assignmentId>", "Assignment ID to start conversation for")
        .action(async (assignmentId: string) => {
            const client = await getClient();

            // Create new conversation via API
            const result = await client.conversations.create(assignmentId);

            if (!result.success) {
                error(`Failed to create conversation: ${result.error}`);
                process.exit(1);
            }

            if (result.data.isExisting) {
                info(`Resuming existing conversation: ${result.data.id}`);
            } else {
                success(`Created conversation: ${result.data.id}`);
            }

            const session = new CLIStreamingSession(client, result.data.id);
            await session.start();
        });

    streaming
        .command("resume")
        .description("Resume an existing conversation for an assignment")
        .argument("<assignmentId>", "Assignment ID")
        .action(async (assignmentId: string) => {
            const client = await getClient();

            // Get existing conversation
            const result =
                await client.conversations.getForAssignment(assignmentId);

            if (!result.success) {
                error(`No conversation found: ${result.error}`);
                info(
                    "Use 'stream new <assignmentId>' to start a new conversation.",
                );
                process.exit(1);
            }

            if (result.data.state === "closed") {
                error("This conversation has already ended.");
                process.exit(1);
            }

            success(`Resuming conversation: ${result.data.id}`);

            const session = new CLIStreamingSession(client, result.data.id);
            await session.start();
        });

    return streaming;
}
