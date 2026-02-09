import { GoogleGenAI } from "@google/genai";
import * as readline from "readline";
import type { DialogueState } from "../src/builder/types.js";
import { GeminiPromptExecutor } from "../src/executor/gemini.js";
import { MentoraOrchestrator } from "../src/orchestrator/orchestrator.js";

const genai = new GoogleGenAI({});
const model = process.env.TEST_MODEL || "gemini-3-flash-preview";

const executor = new GeminiPromptExecutor(genai, model);
const orchestrator = new MentoraOrchestrator(executor, {
    logger: (msg, ...args) => {
        // Uncomment to see verbose logs
        // console.log(msg, ...args);
    },
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function printState(state: DialogueState) {
    console.log("\n" + "=".repeat(50));
    console.log(`STATUS REPORT`);
    console.log(`Current Stage: ${state.stage}`);
    console.log(`Topic: ${state.topic}`);
    console.log(`History Depth: ${state.conversationHistory.length} messages`);

    console.log("=".repeat(50) + "\n");
}

async function main() {
    console.log("Mentora AI Terminal Interface");
    console.log("----------------------------");

    rl.question(
        "Qual topic would you like to discuss? (Default: 白帽駭客是否需要黑帽駭客的存在？): ",
        async (topicInput) => {
            const topic =
                topicInput.trim() || "白帽駭客是否需要黑帽駭客的存在？";

            try {
                console.log(`\nInitializing session for topic: ${topic}...`);
                let state = orchestrator.initializeSession(topic);

                // Start conversation
                const startResult = await orchestrator.startConversation(state);
                state = startResult.newState;

                console.log(`\nAI: ${startResult.message}`);
                printState(state);

                const chatLoop = () => {
                    rl.question("\nYou: ", async (userInput) => {
                        if (
                            userInput.toLowerCase() === "exit" ||
                            userInput.toLowerCase() === "quit"
                        ) {
                            console.log("Goodbye!");
                            rl.close();
                            return;
                        }

                        try {
                            const result =
                                await orchestrator.processStudentInput(
                                    state,
                                    userInput,
                                );
                            state = result.newState;

                            console.log(`\nAI: ${result.message}`);

                            // If we have extracted data in the result, maybe we could log it?
                            // But processStudentInput returns StageResult which has the message and newState.
                            // The decision data is internal to the handler unless we modify the return type.
                            // For now, logging the new state is good.

                            printState(state);

                            if (result.ended) {
                                console.log("\nConversation Ended.");
                                rl.close();
                            } else {
                                chatLoop();
                            }
                        } catch (error) {
                            console.error("\nError processing input:", error);
                            chatLoop();
                        }
                    });
                };

                chatLoop();
            } catch (error) {
                console.error("Fatal error:", error);
                rl.close();
            }
        },
    );
}

main();
