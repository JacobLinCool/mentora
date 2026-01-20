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

    // Mock data for testing
    const mockQuestions: Question[] = [
        {
            type: "single_choice",
            id: "q1",
            question: "在這個論點中，您認為最關鍵的假設是什麼？",
            options: [
                "所有的數據都是準確的",
                "過去的趨勢會延續到未來",
                "外部因素不會改變",
                "樣本具有代表性",
            ],
            required: true,
        },
        {
            type: "multiple_choice",
            id: "q2",
            question: "以下哪些是批判性思維的核心要素？（可複選）",
            options: [
                "分析論證的結構",
                "識別隱含假設",
                "評估證據的可靠性",
                "考慮替代觀點",
                "接受權威的意見",
            ],
            required: true,
        },
        {
            type: "short_answer",
            id: "q3",
            question: "請簡述您對這個觀點的看法，並提供支持您立場的理由。",
            placeholder: "請輸入您的想法...",
            maxLength: 500,
            required: true,
        },
        {
            type: "single_choice",
            id: "q4",
            question: "當面對相互矛盾的資訊時，您通常會採取什麼策略？",
            options: [
                "選擇最可信的來源",
                "尋找更多資訊來驗證",
                "分析每個來源的偏見",
                "暫時保留判斷",
            ],
            required: true,
        },
    ];

    // State
    let currentIndex = $state(0);
    let answers = $state<Record<string, string | string[]>>({});

    // Navigation state
    let courseId = $state<string | null>(null);
    const assignmentId = $derived(page.params.id);

    $effect(() => {
        if (assignmentId) {
            api.assignments.get(assignmentId).then((res) => {
                if (res.success && res.data.courseId) {
                    courseId = res.data.courseId;
                }
            });
        }
    });

    function goBack() {
        if (courseId) {
            goto(resolve(`/courses/${courseId}`));
        } else {
            goto(resolve("/assignments"));
        }
    }

    // Derived
    let currentQuestion = $derived(mockQuestions[currentIndex]);
    let totalQuestions = $derived(mockQuestions.length);
    let isLastQuestion = $derived(currentIndex === totalQuestions - 1);

    // Check if current question is answered (for required validation)
    let isCurrentAnswered = $derived(() => {
        const answer = answers[currentQuestion.id];
        if (!currentQuestion.required) return true;
        if (answer === undefined) return false;
        if (Array.isArray(answer)) return answer.length > 0;
        return answer.trim().length > 0;
    });

    function handleSingleChoiceAnswer(value: string) {
        answers[currentQuestion.id] = value;
        // Auto-advance after short delay
        setTimeout(() => {
            if (currentIndex < totalQuestions - 1) {
                currentIndex++;
            }
        }, 300);
    }

    function handleMultipleChoiceAnswer(value: string[]) {
        answers[currentQuestion.id] = value;
    }

    function handleShortAnswer(value: string) {
        answers[currentQuestion.id] = value;
    }

    function handlePrev() {
        if (currentIndex > 0) {
            currentIndex--;
        }
    }

    function handleNext() {
        if (currentIndex < totalQuestions - 1) {
            currentIndex++;
        }
    }

    function handleSubmit() {
        // TODO: Submit answers to API
        console.log("Submitting answers:", answers);
        // Navigate back to assignment or show completion
        if (courseId) {
            goto(resolve(`/courses/${courseId}`));
        } else {
            goto(resolve("/dashboard"));
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
