<script lang="ts">
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import { api, type QuestionnaireResponse } from "$lib/api";
    import { ArrowLeft } from "@lucide/svelte";

    import PageHead from "$lib/components/PageHead.svelte";
    import SingleChoiceQuestion from "$lib/components/questionnaire/SingleChoiceQuestion.svelte";
    import MultipleChoiceQuestion from "$lib/components/questionnaire/MultipleChoiceQuestion.svelte";
    import ShortAnswerQuestion from "$lib/components/questionnaire/ShortAnswerQuestion.svelte";
    import QuestionNavigator from "$lib/components/questionnaire/QuestionNavigator.svelte";
    import QuestionProgress from "$lib/components/questionnaire/QuestionProgress.svelte";

    // Question type definitions
    type SingleChoice = {
        type: "single_choice";
        id: string;
        question: string;
        options: string[];
        required: boolean;
    };

    type MultipleChoice = {
        type: "multiple_choice";
        id: string;
        question: string;
        options: string[];
        required: boolean;
    };

    type ShortAnswer = {
        type: "short_answer";
        id: string;
        question: string;
        placeholder?: string;
        maxLength?: number;
        required: boolean;
    };

    type Question = SingleChoice | MultipleChoice | ShortAnswer;

    // State
    let currentIndex = $state(0);
    let answers = $state<Record<string, string | string[]>>({});
    let submitting = $state(false);
    let questions = $state<Question[]>([]);

    // Navigation state
    let courseId = $state<string | null>(null);
    const assignmentId = $derived(page.params.id);

    $effect(() => {
        if (assignmentId && api.isAuthenticated) {
            loadData();
        }
    });

    async function loadData() {
        if (!assignmentId) return;
        try {
            // Load questionnaire and submission details
            const [questionnaireRes, myResponseRes] = await Promise.all([
                api.questionnaires.get(assignmentId),
                api.questionnaireResponses.getMine(assignmentId),
            ]);

            const submissionRes = await api.submissions.getMine(assignmentId);

            if (questionnaireRes.success) {
                const qa = questionnaireRes.data;
                courseId = qa.courseId ?? null;

                // Ensure submission exists (Start it if not)
                if (!submissionRes.success || !submissionRes.data) {
                    await api.submissions.start(assignmentId);
                }

                if (qa.questions && Array.isArray(qa.questions)) {
                    // Map backend question schema to UI question schema
                    questions = qa.questions.map(
                        (q, index: number): Question => {
                            const base = q.question;
                            const id = index.toString();
                            const required = q.required;
                            const questionText = base.questionText;

                            if (base.type === "single_answer_choice") {
                                return {
                                    type: "single_choice",
                                    id,
                                    question: questionText,
                                    options: base.options,
                                    required,
                                };
                            } else if (base.type === "multiple_answer_choice") {
                                return {
                                    type: "multiple_choice",
                                    id,
                                    question: questionText,
                                    options: base.options,
                                    required,
                                };
                            } else {
                                // short_answer
                                // Define interface for potential extra fields
                                const shortBase = base as {
                                    placeholder?: string;
                                    maxLength?: number;
                                };
                                return {
                                    type: "short_answer",
                                    id,
                                    question: questionText,
                                    required,
                                    placeholder: shortBase.placeholder,
                                    maxLength: shortBase.maxLength,
                                };
                            }
                        },
                    );

                    // Restore existing answers from QuestionnaireResponse
                    if (myResponseRes.success && myResponseRes.data) {
                        const savedResponses = myResponseRes.data.responses;
                        if (Array.isArray(savedResponses)) {
                            savedResponses.forEach((r) => {
                                // Identify question by index
                                const qIndex = r.questionIndex;
                                if (qIndex >= 0 && qIndex < questions.length) {
                                    const qId = questions[qIndex].id;
                                    if (
                                        r.answer &&
                                        r.answer.response !== undefined
                                    ) {
                                        const val = r.answer.response;
                                        answers[qId] =
                                            typeof val === "number"
                                                ? String(val)
                                                : val;
                                    }
                                }
                            });
                        }
                    }
                } else {
                    questions = [];
                }
            } else {
                console.error(
                    "Failed to load questionnaire",
                    questionnaireRes.error,
                );
            }
        } catch (e) {
            console.error("Failed to load questionnaire", e);
        } finally {
            // loading = false;
        }
    }

    async function saveAnswers() {
        if (!assignmentId || !api.currentUser) return;

        // Map UI answers to Backend Schema Responses
        // Schema requires: { questionIndex: number, answer: { type: string, response: any } }[]
        const responses: QuestionnaireResponse["responses"] = questions
            .map((q, index) => {
                // Use index for backend mapping
                const answerVal = answers[q.id];

                // Skip missing answers
                if (answerVal === undefined) return null;

                // Construct strictly typed response object based on question type
                if (q.type === "short_answer") {
                    return {
                        questionIndex: index,
                        answer: {
                            type: "short_answer" as const,
                            response: answerVal as string,
                        },
                    };
                }
                if (q.type === "single_choice") {
                    return {
                        questionIndex: index,
                        answer: {
                            type: "single_answer_choice" as const,
                            response: answerVal as string,
                        },
                    };
                }
                if (q.type === "multiple_choice") {
                    return {
                        questionIndex: index,
                        answer: {
                            type: "multiple_answer_choice" as const,
                            response: answerVal as string[],
                        },
                    };
                }
                return null;
            })
            // Filter out nulls and satisfy TS
            .filter((r): r is NonNullable<typeof r> => r !== null);

        try {
            // Call api.questionnaireResponses.submit
            const result = await api.questionnaireResponses.submit(
                assignmentId,
                responses,
                courseId,
            );

            if (!result.success) {
                console.error("Failed to save answers:", result.error);
            }
        } catch (e) {
            console.error("Failed to save answers", e);
        }
    }

    function goBack() {
        if (courseId) {
            goto(resolve(`/courses/${courseId}`));
        } else {
            goto(resolve("/dashboard"));
        }
    }

    // Derived
    let currentQuestion = $derived(questions[currentIndex]);
    let totalQuestions = $derived(questions.length > 0 ? questions.length : 0);
    let isLastQuestion = $derived(currentIndex === totalQuestions - 1);

    // Check if current question is answered (for required validation)
    let isCurrentAnswered = $derived(() => {
        if (!currentQuestion) return false;
        const answer = answers[currentQuestion.id];
        if (!currentQuestion.required) return true;
        if (answer === undefined) return false;
        if (Array.isArray(answer)) return answer.length > 0;
        return answer.trim().length > 0;
    });

    function handleSingleChoiceAnswer(value: string) {
        if (!currentQuestion) return;
        answers[currentQuestion.id] = value;
        // Auto-advance after short delay
        setTimeout(() => {
            if (currentIndex < totalQuestions - 1) {
                currentIndex++;
            }
        }, 300);
    }

    function handleMultipleChoiceAnswer(value: string[]) {
        if (!currentQuestion) return;
        answers[currentQuestion.id] = value;
    }

    function handleShortAnswer(value: string) {
        if (!currentQuestion) return;
        answers[currentQuestion.id] = value;
    }

    function handlePrev() {
        if (currentIndex > 0) {
            currentIndex--;
        }
    }

    async function handleNext() {
        if (currentIndex < totalQuestions - 1) {
            currentIndex++;
            // Save progress automatically
            if (assignmentId) {
                await saveAnswers();
            }
        }
    }

    async function handleSubmit() {
        if (submitting || !assignmentId) return;

        // Final validation: Ensure current question is answered if required
        // Especially critical for Essays/Short Answer if user types nothing
        if (!isCurrentAnswered()) {
            // Optional: Show a toast or visual shake? For now, we rely on the button disabled state.
            // But if this is called programmatically or button not disabled correctly:
            return;
        }

        submitting = true;

        try {
            // Save final answers
            await saveAnswers();
            // Submit assignment (updates status to 'submitted')
            await api.submissions.submit(assignmentId);

            // Navigate back
            if (courseId) {
                goto(resolve(`/courses/${courseId}`));
            } else {
                goto(resolve("/dashboard"));
            }
        } catch (e) {
            console.error("Failed to submit", e);
        } finally {
            submitting = false;
        }
    }

    function getCurrentAnswer<T>(questionId: string, defaultValue: T): T {
        const answer = answers[questionId];
        if (answer === undefined) return defaultValue;
        return answer as T;
    }
</script>

<PageHead title="問卷作答" description="完成問卷作答" />

<div class="questionnaire-container">
    <!-- Background -->
    <div class="background"></div>

    {#if courseId}
        <div class="absolute top-6 left-6 z-50">
            <button
                class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/10 transition-all hover:-translate-x-0.5 hover:bg-white/15"
                onclick={goBack}
                aria-label="Back to course"
            >
                <ArrowLeft class="h-5 w-5 text-white" />
            </button>
        </div>
    {/if}

    <!-- Content -->
    <div class="content">
        <!-- Question area -->
        <div class="question-area">
            {#if currentQuestion}
                {#key currentQuestion.id}
                    <div class="question-wrapper">
                        {#if currentQuestion.type === "single_choice"}
                            <SingleChoiceQuestion
                                question={currentQuestion.question}
                                options={currentQuestion.options}
                                value={getCurrentAnswer(currentQuestion.id, "")}
                                onAnswer={handleSingleChoiceAnswer}
                            />
                        {:else if currentQuestion.type === "multiple_choice"}
                            <MultipleChoiceQuestion
                                question={currentQuestion.question}
                                options={currentQuestion.options}
                                value={getCurrentAnswer(currentQuestion.id, [])}
                                onAnswer={handleMultipleChoiceAnswer}
                            />
                        {:else if currentQuestion.type === "short_answer"}
                            <ShortAnswerQuestion
                                question={currentQuestion.question}
                                placeholder={currentQuestion.placeholder}
                                maxLength={currentQuestion.maxLength}
                                value={getCurrentAnswer(currentQuestion.id, "")}
                                onAnswer={handleShortAnswer}
                            />
                        {/if}
                    </div>
                {/key}
            {:else}
                <div
                    class="flex h-full w-full flex-col items-center justify-center gap-4"
                >
                    <p class="text-white/50">No questions available.</p>
                    <button
                        class="icon-btn rounded-full bg-white/10 p-2 hover:bg-white/20"
                        onclick={goBack}
                    >
                        <ArrowLeft size={24} color="white" />
                    </button>
                </div>
            {/if}
        </div>

        <!-- Spacer -->
        <div class="spacer"></div>

        <!-- Navigation -->
        <div class="nav-area">
            <QuestionNavigator
                {currentIndex}
                {totalQuestions}
                canGoNext={isCurrentAnswered()}
                {isLastQuestion}
                onPrev={handlePrev}
                onNext={handleNext}
                onSubmit={handleSubmit}
            />
        </div>

        <!-- Progress -->
        <div class="progress-area">
            <QuestionProgress {currentIndex} {totalQuestions} />
        </div>
    </div>
</div>

<style>
    .questionnaire-container {
        position: fixed;
        inset: 0;
        overflow: hidden;
    }

    .background {
        position: absolute;
        inset: 0;
        background: linear-gradient(
            135deg,
            #5a5a5a 0%,
            #3a3a3a 50%,
            #4a4a4a 100%
        );
        z-index: -1;
    }

    .background::before {
        content: "";
        position: absolute;
        top: -20%;
        left: -10%;
        width: 60%;
        height: 60%;
        background: radial-gradient(
            ellipse,
            rgba(100, 100, 100, 0.4) 0%,
            transparent 70%
        );
    }

    .content {
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 0 1.5rem;
    }

    @media (min-width: 768px) {
        .content {
            padding: 0 3rem;
            max-width: 42rem;
            margin: 0 auto;
            width: 100%;
        }
    }

    @media (min-width: 1024px) {
        .content {
            padding: 0 4rem;
            max-width: 48rem;
        }
    }

    .question-area {
        flex: 1;
        display: flex;
        align-items: center;
        padding-top: 2rem;
    }

    .question-wrapper {
        width: 100%;
        animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateX(20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    .spacer {
        flex-shrink: 0;
        min-height: 1rem;
    }

    .nav-area {
        flex-shrink: 0;
    }

    .progress-area {
        flex-shrink: 0;
        padding-bottom: env(safe-area-inset-bottom, 1rem);
    }
</style>
