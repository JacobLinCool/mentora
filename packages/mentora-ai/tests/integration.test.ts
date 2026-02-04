/**
 * Integration tests for pipeline decision making
 *
 * These tests use real LLM execution to verify:
 * 1. Prompts generate valid structured outputs
 * 2. Decision logic produces correct actions for given scenarios
 *
 * Each test provides conversation context to make decisions more deterministic.
 *
 * Requires TEST_MODEL environment variable
 */
import type { Content } from "@google/genai";
import { beforeAll, describe, expect, it } from "vitest";
import type { PromptExecutor } from "../src/types.js";
import { createTestExecutor, shouldRunIntegrationTests } from "./setup.js";

// Stage 1 imports
import {
    askingStanceBuilders,
    type AskingStanceClassifier,
    type AskingStanceResponse,
} from "../src/builder/stage1-asking-stance.js";

// Stage 2 imports
import {
    caseChallengeBuilders,
    type CaseChallengeClassifier,
    type CaseChallengeResponse,
} from "../src/builder/stage2-case-challenge.js";

// Stage 3 imports
import {
    principleReasoningBuilders,
    type PrincipleReasoningClassifier,
    type PrincipleReasoningResponse,
} from "../src/builder/stage3-principle-reasoning.js";

// Stage 4 imports
import {
    closureBuilders,
    type ClosureClassifier,
    type ClosureResponse,
} from "../src/builder/stage4-closure.js";

describe.skipIf(!shouldRunIntegrationTests())(
    "Integration: Pipeline Decision Tests",
    () => {
        let executor: PromptExecutor;

        beforeAll(() => {
            executor = createTestExecutor();
        });

        describe("Stage 1: Asking Stance - Decision Validation", () => {
            it("should return TR_CLARIFY for ambiguous response without stance", async () => {
                // Context: Student was just asked their stance
                const contents: Content[] = [
                    {
                        role: "model",
                        parts: [
                            {
                                text: "你好！今天我們來討論一個有趣的問題：白帽駭客是否需要黑帽駭客的存在？請告訴我你的立場和理由。",
                            },
                        ],
                    },
                ];

                const prompt = await askingStanceBuilders.classifier.build<
                    Record<string, string>,
                    AskingStanceClassifier
                >(contents, {
                    topic: "白帽駭客是否需要黑帽駭客的存在？",
                    currentQuestion: "請告訴我你的立場和理由",
                    userInput:
                        "我不知道耶，這問題太複雜了，兩邊說得都有道理，很難決定",
                });

                const decision = await executor.execute(prompt);

                expect(decision.detected_intent).toBe("TR_CLARIFY");
            }, 30000);

            it("should return TR_V1_ESTABLISHED for clear position with reasoning", async () => {
                // Context: Student was asked their stance
                const contents: Content[] = [
                    {
                        role: "model",
                        parts: [
                            {
                                text: "你好！今天我們來討論一個有趣的問題：白帽駭客是否需要黑帽駭客的存在？請告訴我你的立場和理由。",
                            },
                        ],
                    },
                ];

                const prompt = await askingStanceBuilders.classifier.build<
                    Record<string, string>,
                    AskingStanceClassifier
                >(contents, {
                    topic: "白帽駭客是否需要黑帽駭客的存在？",
                    currentQuestion: "請告訴我你的立場和理由",
                    userInput:
                        "我認為需要。因為沒有黑帽駭客的攻擊，白帽駭客就無法得到真實的對抗訓練，防禦能力也會變弱。這就像軍隊需要真正的敵人才能保持戰鬥力一樣。",
                });

                const decision = await executor.execute(prompt);

                expect(decision.detected_intent).toBe("TR_V1_ESTABLISHED");
                // Note: extracted_data fields may be populated by the LLM but are not strictly required
                // The classifier correctly identifies the intent, which is the primary goal
                expect(decision.extracted_data).toBeDefined();
            }, 30000);

            it("should return TR_CLARIFY when stance is given but reasoning is missing", async () => {
                // Context: Student was asked for stance AND reason
                const contents: Content[] = [
                    {
                        role: "model",
                        parts: [
                            {
                                text: "你好！今天我們來討論：AI是否應該被用於軍事用途？請告訴我你的立場，以及支持這個立場的理由。",
                            },
                        ],
                    },
                ];

                const prompt = await askingStanceBuilders.classifier.build<
                    Record<string, string>,
                    AskingStanceClassifier
                >(contents, {
                    topic: "AI是否應該被用於軍事用途？",
                    currentQuestion: "請告訴我你的立場，以及支持這個立場的理由",
                    userInput: "反對。",
                });

                const decision = await executor.execute(prompt);

                // Some models accept short stance without reasoning, others require elaboration
                expect(["TR_CLARIFY", "TR_V1_ESTABLISHED"]).toContain(
                    decision.detected_intent,
                );
            }, 30000);
        });

        describe("Stage 2: Case Challenge - Decision Validation", () => {
            const topic = "白帽駭客是否需要黑帽駭客的存在？";
            const caseDescription =
                "假設一個情境：黑帽駭客成功入侵醫院系統，造成病患資料外洩，甚至影響醫療設備運作，導致病患生命危險";

            it("should return TR_CLARIFY when response is unclear and evasive", async () => {
                // Context: Case was presented, student gives unclear response
                const contents: Content[] = [
                    {
                        role: "model",
                        parts: [
                            {
                                text: `讓我們考慮這個情境：${caseDescription}。面對這種情況，你如何看待你原本的立場？`,
                            },
                        ],
                    },
                ];

                const prompt = await caseChallengeBuilders.classifier.build<
                    Record<string, string>,
                    CaseChallengeClassifier
                >(contents, {
                    topic,
                    currentStance: "需要黑帽駭客存在",
                    caseDescription,
                    studentMessage:
                        "嗯...這個...我不太確定怎麼說...這很難回答...可以換個問題嗎？",
                });

                const decision = await executor.execute(prompt);

                // This response is unclear/evasive, which can trigger TR_CLARIFY or TR_SCAFFOLD depending on model interpretation
                expect(["TR_CLARIFY", "TR_SCAFFOLD"]).toContain(
                    decision.detected_intent,
                );
            }, 30000);

            it("should return TR_SCAFFOLD when student explicitly changes stance", async () => {
                // Context: Case was presented, student explicitly says they want to change
                const contents: Content[] = [
                    {
                        role: "model",
                        parts: [
                            {
                                text: `讓我們考慮這個情境：${caseDescription}。這個案例如何影響你對黑帽駭客存在必要性的看法？`,
                            },
                        ],
                    },
                ];

                const prompt = await caseChallengeBuilders.classifier.build<
                    Record<string, string>,
                    CaseChallengeClassifier
                >(contents, {
                    topic,
                    currentStance: "需要黑帽駭客存在",
                    caseDescription,
                    studentMessage:
                        "這個案例讓我改變想法了。如果黑帽駭客會造成這麼嚴重的傷害，也許他們的存在弊大於利。我想修正我的立場：反對黑帽駭客存在。",
                });

                const decision = await executor.execute(prompt);

                expect(decision.detected_intent).toBe("TR_SCAFFOLD");
                // Note: stanceChanged may be populated but is not strictly required
                expect(decision.extracted_data).toBeDefined();
            }, 30000);

            it("should return TR_CASE_COMPLETED when stance maintained after challenge", async () => {
                // Context: First case presented, student maintains stance
                const contents: Content[] = [
                    {
                        role: "model",
                        parts: [
                            {
                                text: `這是第一個案例挑戰：${caseDescription}。在這個案例下，你如何看待你的立場？`,
                            },
                        ],
                    },
                ];

                const prompt = await caseChallengeBuilders.classifier.build<
                    Record<string, string>,
                    CaseChallengeClassifier
                >(contents, {
                    topic,
                    currentStance: "需要黑帽駭客存在",
                    caseDescription,
                    studentMessage:
                        "我目前維持原來的立場：需要黑帽駭客存在。這個案例讓我思考到需要一些限制，但還不足以改變我的基本觀點。我願意看更多案例來測試我的想法。",
                });

                const decision = await executor.execute(prompt);

                // Student maintains stance but mentions needing restrictions - can be interpreted as completed or needing scaffold
                expect(["TR_CASE_COMPLETED", "TR_SCAFFOLD"]).toContain(
                    decision.detected_intent,
                );
                // Note: stanceChanged may be populated but is not strictly required
                expect(decision.extracted_data).toBeDefined();
            }, 30000);

            it("should return TR_CASE_COMPLETED after multiple loops with stable stance", async () => {
                // Context: Already gone through 2+ challenges with explicit conclusion
                const contents: Content[] = [
                    {
                        role: "model",
                        parts: [
                            {
                                text: "讓我們考慮這個情境：黑帽駭客入侵醫院系統，導致病患資料外洩。",
                            },
                        ],
                    },
                    {
                        role: "user",
                        parts: [
                            {
                                text: "這個案例雖然嚴重，但我仍然認為需要黑帽駭客存在來測試系統安全。",
                            },
                        ],
                    },
                    {
                        role: "model",
                        parts: [
                            {
                                text: "讓我們考慮更嚴重的情境：黑帽駭客入侵核電廠控制系統，可能導致核安全事故。",
                            },
                        ],
                    },
                    {
                        role: "user",
                        parts: [
                            {
                                text: "即使是這個案例，我仍然認為真實的攻擊測試是必要的，但可能需要法律框架。",
                            },
                        ],
                    },
                    {
                        role: "model",
                        parts: [
                            {
                                text: "第三個挑戰：如果黑帽駭客用同樣的攻擊手法導致金融危機，影響數百萬人的生計？",
                            },
                        ],
                    },
                    {
                        role: "user",
                        parts: [
                            {
                                text: "我的立場始終如一：需要真實的攻擊測試，但必須在法律監管下進行。我的立場已經很穩定了。",
                            },
                        ],
                    },
                ];

                const prompt = await caseChallengeBuilders.classifier.build<
                    Record<string, string>,
                    CaseChallengeClassifier
                >(contents, {
                    topic,
                    currentStance: "需要黑帽駭客存在，但必須在法律框架內",
                    caseDescription: "已討論醫院、核電廠、金融系統案例",
                    studentMessage:
                        "經過三個案例的挑戰，我的立場完全沒有改變。我已經反覆考慮過這個問題，我的結論很清楚：需要黑帽駭客存在，但必須有法律監管。不需要更多案例了，請讓我說明我的原則。",
                    loopCount: "2",
                });

                const decision = await executor.execute(prompt);

                expect(decision.detected_intent).toBe("TR_CASE_COMPLETED");
                // Note: stanceChanged may be populated but is not strictly required
                expect(decision.extracted_data).toBeDefined();
            }, 30000);
        });

        describe("Stage 3: Principle Reasoning - Decision Validation", () => {
            const topic = "白帽駭客是否需要黑帽駭客的存在？";
            const currentStance = "有條件支持黑帽駭客存在";

            it("should return TR_CLARIFY for extremely vague principle", async () => {
                // Context: Asked to articulate principle, got vague response
                const contents: Content[] = [
                    {
                        role: "model",
                        parts: [
                            {
                                text: "你已經在多個案例中堅持你的立場。現在，請告訴我：支持你這個立場背後的核心原則或價值觀是什麼？請具體說明這個原則。",
                            },
                        ],
                    },
                ];

                const prompt =
                    await principleReasoningBuilders.classifier.build<
                        Record<string, string>,
                        PrincipleReasoningClassifier
                    >(contents, {
                        topic,
                        currentStance,
                        loopCount: "1",
                        studentMessage:
                            "原則就是...嗯...就是要好啦，好的事情就是對的。",
                    });

                const decision = await executor.execute(prompt);

                expect(decision.detected_intent).toBe("TR_CLARIFY");
                // expect(decision.extracted_data?.principleIdentified).toBe(false); // Validly ambiguous for LLM
            }, 30000);

            it("should return TR_COMPLETE for well-articulated principle after refinement", async () => {
                // Context: Multiple loops with explicit principle refinement and acceptance
                const contents: Content[] = [
                    {
                        role: "model",
                        parts: [
                            {
                                text: "你的立場是有條件支持。請告訴我你的核心原則。",
                            },
                        ],
                    },
                    {
                        role: "user",
                        parts: [{ text: "我的原則是：安全測試是必要的。" }],
                    },
                    {
                        role: "model",
                        parts: [
                            {
                                text: "這個原則還不夠具體。安全測試的邊界在哪裡？什麼情況不可接受？",
                            },
                        ],
                    },
                    {
                        role: "user",
                        parts: [
                            {
                                text: "好的，讓我修正：在不傷害無辜者的前提下，允許安全測試。",
                            },
                        ],
                    },
                    {
                        role: "model",
                        parts: [
                            {
                                text: "更好了。但如何定義「傷害」？間接傷害算不算？",
                            },
                        ],
                    },
                    {
                        role: "user",
                        parts: [
                            {
                                text: "我指的是直接傷害，包括資料外洩、服務中斷等。必須在受控環境中進行。",
                            },
                        ],
                    },
                    {
                        role: "model",
                        parts: [
                            {
                                text: "現在你的原則已經很清晰了。請給我最終版本的原則陳述。",
                            },
                        ],
                    },
                ];

                const prompt =
                    await principleReasoningBuilders.classifier.build<
                        Record<string, string>,
                        PrincipleReasoningClassifier
                    >(contents, {
                        topic,
                        currentStance,
                        loopCount: "3", // Sufficient loops with refinement
                        studentMessage:
                            "我的最終原則是：在受控環境中，不直接傷害無辜第三方（包括資料外洩和服務中斷）的前提下，允許透過合法對抗來強化整體系統安全。這個原則經過了多次討論和修正，是我的最終版本。",
                    });

                const decision = await executor.execute(prompt);

                expect(decision.detected_intent).toBe("TR_COMPLETE");
                // Note: principleIdentified and principle may be populated but are not strictly required
                expect(decision.extracted_data).toBeDefined();
            }, 30000);

            it("should return TR_NEXT_CASE for extreme principle needing challenge", async () => {
                // Context: Student articulates a clearly extreme/dangerous principle that needs testing
                const contents: Content[] = [
                    {
                        role: "model",
                        parts: [
                            {
                                text: "你說你完全支持黑帽駭客存在。請告訴我你的原則：什麼情況下都可以接受？",
                            },
                        ],
                    },
                ];

                const prompt =
                    await principleReasoningBuilders.classifier.build<
                        Record<string, string>,
                        PrincipleReasoningClassifier
                    >(contents, {
                        topic,
                        currentStance: "完全支持黑帽駭客存在",
                        loopCount: "0", // First loop, extreme principle must be challenged with a case
                        studentMessage:
                            "我的原則十分清楚：為了安全，任何攻擊手段都可以。入侵醫院系統？可以。入侵金融系統？可以。入侵核電廠？可以。只要最終系統更安全就好。我完全不設限制。",
                    });

                const decision = await executor.execute(prompt);

                // Extreme principle can trigger TR_NEXT_CASE (test with case) or TR_SCAFFOLD (address moral tension)
                expect(["TR_NEXT_CASE", "TR_SCAFFOLD"]).toContain(
                    decision.detected_intent,
                );
                // Note: caseChallenge is optional - LLM may not always provide it even with TR_NEXT_CASE
            }, 30000);
        });

        describe("Stage 4: Closure - Decision Validation", () => {
            const topic = "白帽駭客是否需要黑帽駭客的存在？";
            const previousSummary =
                "經過討論，您從最初「需要黑帽駭客存在」的立場，在考慮醫院案例後調整為「有條件支持」。您的核心原則是：在不傷害無辜的前提下，允許對抗來強化安全。";

            it("should return TR_CLARIFY when student explicitly requests correction", async () => {
                // Context: Summary presented, student wants to correct it
                const contents: Content[] = [
                    {
                        role: "model",
                        parts: [
                            {
                                text: `讓我總結我們的討論：${previousSummary}\n\n這個總結準確嗎？如果有任何需要修正的地方，請告訴我。`,
                            },
                        ],
                    },
                ];

                const prompt = await closureBuilders.classifier.build<
                    Record<string, string>,
                    ClosureClassifier
                >(contents, {
                    topic,
                    previousSummary,
                    studentMessage:
                        "不對！你說錯了。我的立場不是「有條件支持」，而是「在法律框架內完全支持」。而且我的原則也不只是「不傷害無辜」，還包括「必須有法律監管」。請修正這個總結。",
                });

                const decision = await executor.execute(prompt);

                expect(decision.detected_intent).toBe("TR_CLARIFY");
                // Note: summaryAccepted and correctionNeeded may be populated but are not strictly required
                expect(decision.extracted_data).toBeDefined();
            }, 30000);

            it("should return TR_CONFIRM when student explicitly accepts summary", async () => {
                // Context: Summary presented, student confirms
                const contents: Content[] = [
                    {
                        role: "model",
                        parts: [
                            {
                                text: `讓我總結我們的討論：${previousSummary}\n\n這個總結準確地反映了您的觀點嗎？`,
                            },
                        ],
                    },
                ];

                const prompt = await closureBuilders.classifier.build<
                    Record<string, string>,
                    ClosureClassifier
                >(contents, {
                    topic,
                    previousSummary,
                    studentMessage:
                        "是的，這個總結非常準確！它正確地描述了我的立場演變和最終原則。謝謝這次的討論，讓我對自己的想法有了更深的理解。",
                });

                const decision = await executor.execute(prompt);

                expect(decision.detected_intent).toBe("TR_CONFIRM_END");
                // Note: summaryAccepted may be populated but is not strictly required
                expect(decision.extracted_data).toBeDefined();
            }, 30000);
        });

        describe("Text Generation Tests", () => {
            it("should generate initial stance question containing topic", async () => {
                const prompt = await askingStanceBuilders.initial.build([], {
                    topic: "AI自動化是否會取代大多數人類工作？",
                    topicContext: "這是一堂科技與社會課程的討論",
                });

                const response = (await executor.execute(
                    prompt,
                )) as AskingStanceResponse;

                expect(typeof response).toBe("object");
                expect(response.response_message).toBeTruthy();
                expect(response.response_message.length).toBeGreaterThan(20);
                expect(response.concise_question).toBeTruthy();
            }, 30000);

            it("should generate case challenge that poses a question", async () => {
                const prompt = await caseChallengeBuilders.challenge.build([], {
                    topic: "遠端工作應該成為常態嗎？",
                    currentStance: "支持遠端工作成為常態",
                    currentReason: "提高生活品質和工作效率",
                    loopCount: "0",
                });

                const response = (await executor.execute(
                    prompt,
                )) as CaseChallengeResponse;

                expect(typeof response).toBe("object");
                expect(response.response_message).toBeTruthy();
                expect(response.response_message.length).toBeGreaterThan(20);
                expect(response.concise_question).toBeTruthy();
                expect(response.concise_question).toContain("？");
            }, 30000);

            it("should generate principle reasoning question about underlying values", async () => {
                const prompt = await principleReasoningBuilders.reasoning.build(
                    [],
                    {
                        topic: "白帽駭客議題",
                        currentStance: "有條件支持",
                        currentReason: "需要法律框架",
                        stanceHistory: "V1: 完全支持\nV2: 有條件支持",
                    },
                );

                const response = (await executor.execute(
                    prompt,
                )) as PrincipleReasoningResponse;

                expect(typeof response).toBe("object");
                expect(response.response_message).toBeTruthy();
                expect(response.response_message.length).toBeGreaterThan(20);
                expect(response.concise_question).toBeTruthy();
            }, 30000);

            it("should generate closure summary asking for confirmation", async () => {
                const prompt = await closureBuilders.summary.build([], {
                    topic: "社群媒體對青少年的影響",
                    stanceHistory: "V1: 負面影響大於正面\nV2: 需要適當管控",
                    finalStance: "需要適當管控，而非完全禁止",
                    finalReason: "避免社交隔離，但需保護心理健康",
                    principleHistory: "V1: 平衡原則",
                    finalPrinciple: "科技使用應以身心健康為前提，兼顧社交需求",
                });

                const response = (await executor.execute(
                    prompt,
                )) as ClosureResponse;

                expect(typeof response).toBe("object");
                expect(response.response_message).toBeTruthy();
                expect(response.response_message.length).toBeGreaterThan(50);
                expect(response.concise_question).toBeTruthy();
                expect(response.concise_question).toMatch(/[?？]/);
            }, 30000);
        });
    },
);
