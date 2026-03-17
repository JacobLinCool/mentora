<script lang="ts">
    interface Props {
        question: string;
        options: string[];
        value?: string[];
        onAnswer: (value: string[]) => void;
    }

    let { question, options, value = [], onAnswer }: Props = $props();

    function handleToggle(option: string) {
        const newValue = value.includes(option)
            ? value.filter((v) => v !== option)
            : [...value, option];
        onAnswer(newValue);
    }

    function isSelected(option: string): boolean {
        return value.includes(option);
    }
</script>

<div class="w-full">
    <h2
        class="mb-6 text-[1.35rem] leading-[1.45] font-semibold text-white md:text-[1.55rem]"
    >
        {question}
    </h2>

    <div class="flex flex-col gap-3">
        {#each options as option, index (option + "|" + index)}
            <button
                class="flex w-full items-center justify-between gap-4 rounded-xl bg-white/8 px-5 py-4 text-left transition-all duration-200 hover:bg-white/12 {isSelected(
                    option,
                )
                    ? 'bg-white/12'
                    : ''}"
                onclick={() => handleToggle(option)}
            >
                <span class="text-base font-normal text-white">{option}</span>
                <div
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-all duration-200 {isSelected(
                        option,
                    )
                        ? 'border-white/72 bg-white/78'
                        : 'border-white/30'}"
                >
                    {#if isSelected(option)}
                        <svg
                            class="h-3.5 w-3.5 text-[#4b4b4b]"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="3"
                        >
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    {/if}
                </div>
            </button>
        {/each}
    </div>
</div>
