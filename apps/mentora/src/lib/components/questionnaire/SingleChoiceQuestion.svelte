<script lang="ts">
    interface Props {
        question: string;
        options: string[];
        value?: string;
        onAnswer: (value: string) => void;
    }

    let { question, options, value = "", onAnswer }: Props = $props();

    function handleSelect(option: string) {
        onAnswer(option);
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
                class="flex w-full items-center justify-between gap-4 rounded-xl bg-white/8 px-5 py-4 text-left transition-all duration-200 hover:bg-white/12 {value ===
                option
                    ? 'bg-white/12'
                    : ''}"
                onclick={() => handleSelect(option)}
            >
                <span class="text-base font-normal text-white">{option}</span>
                <div
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 {value ===
                    option
                        ? 'border-white/72'
                        : 'border-white/30'}"
                >
                    {#if value === option}
                        <div class="h-2.5 w-2.5 rounded-full bg-white/85"></div>
                    {/if}
                </div>
            </button>
        {/each}
    </div>
</div>
