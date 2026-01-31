<script lang="ts">
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import { api } from "$lib/api";
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
    let conversationId = $state<string | null>(null);

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
            // Load assignment and submission status
            const assignmentRes = await api.assignments.get(assignmentId);
            const submissionRes = await api.submissions.getMine(assignmentId);

            if (assignmentRes.success) {
                courseId = assignmentRes.data.courseId ?? null;
                // Try to parse questions from prompt
                try {
                    const parsed = JSON.parse(assignmentRes.data.prompt);
                    if (Array.isArray(parsed)) {
                        questions = parsed as Question[];
                    } else {
                        throw new Error("Invalid format");
                    }
                } catch {
                    // Fallback
                    if (
                        assignmentRes.data.prompt &&
                        !assignmentRes.data.prompt.startsWith("[")
                    ) {
                        questions = [
                            {
                                type: "short_answer",
                                id: "default_q1",
                                question: assignmentRes.data.prompt,
                                placeholder: "Enter your answer...",
                                required: true,
                            },
                        ];
                    }
                }
            }

            // Ensure submission exists (for state tracking)
            if (!submissionRes.success) {
                await api.submissions.start(assignmentId);
            }

            // Load answers from Linked Conversation
            // We use conversations to store answers because we cannot modify the Submission schema
            const convRes =
                await api.conversations.getForAssignment(assignmentId);

            if (convRes.success) {
                conversationId = convRes.data.id;
                // Find last turn with type 'questionnaire_response'
                const turns = convRes.data.turns || [];
                const lastResponse = [...turns]
                    .reverse()
                    .find((t) => t.type === "questionnaire_response");

                if (lastResponse) {
                    try {
                        answers = JSON.parse(lastResponse.text);
                    } catch (e) {
                        console.error("Failed to parse answers", e);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to load questionnaire", e);
        } finally {
            // loading = false;
        }
    }

    async function saveAnswers() {
        if (!assignmentId || !api.currentUser || !conversationId) return;
        console.log("Api not implemented, skipping save.");
        return;
        /*
        
        try {
            // If we don't have a conversation ID, try to find or create one
            if (!conversationId) {
                // Try get again
                const check =
                    await api.conversations.getForAssignment(assignmentId);
                if (check.success) {
                    conversationId = check.data.id;
                } else {
                    // Create
                    const createRes =
                        await api.conversations.create(assignmentId);
                    if (createRes.success) {
                        conversationId = createRes.data.id;
                    } else {
                        // Fallback message
                        throw new Error(
                            "Could not create conversation context",
                        );
                    }
                }
            }

            if (!conversationId) return;

            // Save answers as a conversation turn
            // Backend schema permits 'questionnaire_response' as a valid turn type string
            const result = await api.conversations.addTurn(
                conversationId,
                JSON.stringify(answers),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any 
                "questionnaire_response" as any,
            );

            if (!result.success) {
                console.error("Failed to save answers:", result.error);
            }
        } catch (e) {
            console.error("Failed to save answers", e);
        }
        */
    }

    function goBack() {
        if (courseId) {
            goto(resolve(`/courses/${courseId}`));
        } else {
            goto(resolve("/assignments"));
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
                class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/10 transition-all hover:translate-x-[-2px] hover:bg-white/15"
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
                <div class="flex h-full w-full items-center justify-center">
                    <p class="text-white/50">No questions available.</p>
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
